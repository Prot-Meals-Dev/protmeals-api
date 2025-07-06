import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { meal_type_enum, order_status_enum } from '@prisma/client';
import { FilterOrdersDto } from './dto/filter-orders.dto';
const dayjs = require('dayjs');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');

dayjs.extend(isSameOrBefore);

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    deliveryPartnerId?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner';
  }) {
    const { deliveryPartnerId, mealType } = filters;

    return await this.prisma.orders.findMany({
      where: {
        assignments: {
          some: {
            ...(deliveryPartnerId && {
              delivery_partner_id: deliveryPartnerId,
            }),
            ...(mealType && { meal_type: mealType }),
          },
        },
      },
      include: {
        user: true,
        meal_type: true,
        coupon: true,
      },
    });
  }

  async findAllOrders(filter: FilterOrdersDto) {
    const { date, paymentStatus, orderStatus, page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (date) {
      const parsedDate = new Date(date);
      where.start_date = {
        gte: new Date(parsedDate.setHours(0, 0, 0, 0)),
        lt: new Date(parsedDate.setHours(23, 59, 59, 999)),
      };
    }

    if (paymentStatus) {
      where.payment_status = paymentStatus;
    }

    if (orderStatus) {
      where.status = orderStatus;
    }

    const [data, total] = await Promise.all([
      this.prisma.orders.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: true,
          preferences: true, // <-- Include preferences for delivery check
        },
      }),
      this.prisma.orders.count({ where }),
    ]);

    return {
      data: data.map((order) => ({
        id: order.id,
        name: order.user?.name,
        address: order.delevery_address,
        start_date: order.start_date,
        isDeliveringToday: checkIfDeliveringToday(order),
        status: order.status,
      })),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    return this.prisma.orders.findUnique({
      where: { id },
      include: { user: true, meal_type: true, coupon: true },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.orders.findMany({
      where: { user_id: userId },
      include: { meal_type: true },
    });
  }

  async updateStatus(id: string, status: order_status_enum) {
    return this.prisma.orders.update({
      where: { id },
      data: {
        status: { set: status },
      },
    });
  }

  async createOrder(data: CreateOrderDto) {
    const amount = await this.calculateAmount(
      data.meal_type_id,
      data.meal_preferences,
      data.start_date,
      data.end_date,
      data.recurring_days,
    );

    // STEP 1: Generate new order_id
    const latestOrder = await this.prisma.orders.findFirst({
      orderBy: { created_at: 'desc' },
      select: { order_id: true },
      where: {
        order_id: {
          startsWith: 'ORD-', // optional, in case some old orders are malformed
        },
      },
    });

    let nextNumber = 1;
    if (latestOrder?.order_id) {
      const match = latestOrder.order_id.match(/ORD-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const formattedOrderId = `ORD-${String(nextNumber).padStart(4, '0')}`;

    // STEP 2: Create order
    const order = await this.prisma.orders.create({
      data: {
        order_id: formattedOrderId,
        user_id: data.customer_id,
        delevery_address: data.delivery_address,
        latitude: data.latitude,
        longitude: data.longitude,
        meal_type_id: data.meal_type_id,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        amount,
        preferences: {
          create: data.recurring_days.map((day) => ({
            week_day: day,
            breakfast: data.meal_preferences.breakfast,
            lunch: data.meal_preferences.lunch,
            dinner: data.meal_preferences.dinner,
          })),
        },
      },
      include: { preferences: true },
    });

    // STEP 3: Handle delivery assignments
    const existingAssignmentsCount =
      await this.prisma.delivery_assignments.count({
        where: {
          delivery_partner_id: data.delivery_partner_id,
          order: {
            status: {
              in: [order_status_enum.pending, order_status_enum.paused],
            },
          },
        },
      });

    const selectedMeals = ['breakfast', 'lunch', 'dinner'].filter(
      (meal) =>
        data.meal_preferences[meal as keyof typeof data.meal_preferences],
    );

    const assignmentsData = selectedMeals.map((meal, index) => ({
      order_id: order.id,
      meal_id: data.meal_type_id,
      delivery_partner_id: data.delivery_partner_id,
      meal_type: meal as meal_type_enum,
      sequence: existingAssignmentsCount + index + 1,
      assigned_by: data.assigned_by,
    }));

    await this.prisma.delivery_assignments.createMany({
      data: assignmentsData,
    });

    return order;
  }

  async calculateAmount(
    mealTypeId: string,
    mealPreferences: { breakfast: boolean; lunch: boolean; dinner: boolean },
    startDate: string,
    endDate: string,
    recurringDays: number[],
  ): Promise<number> {
    const mealType = await this.prisma.meal_types.findUnique({
      where: { id: mealTypeId },
    });

    if (!mealType) throw new BadRequestException('Invalid meal type ID');

    const start = dayjs(startDate).startOf('day');
    const end = dayjs(endDate).startOf('day');

    if (end.isBefore(start)) {
      throw new BadRequestException('End date must be after start date');
    }

    let totalDeliveryDays = 0;
    let current = start.clone();

    while (current.isSameOrBefore(end)) {
      if (recurringDays.includes(current.day())) {
        totalDeliveryDays++;
      }
      current = current.add(1, 'day');
    }

    let total = 0;
    const mealKeys = ['breakfast', 'lunch', 'dinner'] as const;

    for (const key of mealKeys) {
      if (mealPreferences[key]) {
        total += Number(mealType[`${key}_price`]) * Number(totalDeliveryDays);
      }
    }

    return total;
  }
}

// Utility
function checkIfDeliveringToday(order: {
  preferences?: { week_day: number }[];
}) {
  const today = new Date().getDay(); // 0 = Sunday
  return order.preferences?.some((pref) => pref.week_day === today) ?? false;
}
