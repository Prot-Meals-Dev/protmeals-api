import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { meal_type_enum, order_status_enum } from '@prisma/client';
import { FilterOrdersDto } from './dto/filter-orders.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.orders.findMany({
      include: { user: true, meal_type: true, coupon: true },
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
    const order = await this.prisma.orders.create({
      data: {
        user_id: data.customer_id,
        delevery_address: data.delivery_address,
        latitude: data.latitude,
        longitude: data.longitude,
        meal_type_id: data.meal_type_id,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        amount: this.calculateAmount(),
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

    // Get count of current active assignments for this delivery partner
    const activeAssignmentsCount = await this.prisma.delivery_assignments.count(
      {
        where: {
          delivery_partner_id: data.delivery_partner_id,
          order: {
            status: {
              in: [order_status_enum.pending, order_status_enum.paused],
            }, // adjust as needed
          },
        },
      },
    );

    const sequence = activeAssignmentsCount + 1;

    await this.prisma.delivery_assignments.create({
      data: {
        order: { connect: { id: order.id } },
        meal: { connect: { id: data.meal_type_id } },
        delivery_partner: { connect: { id: data.delivery_partner_id } },
        meal_type: (['breakfast', 'lunch', 'dinner'].find(
          (m) => data.meal_preferences[m as keyof typeof data.meal_preferences],
        ) || 'lunch') as meal_type_enum,
        sequence: sequence,
        assigned_by_user: { connect: { id: data.assigned_by } },
      },
    });

    return order;
  }

  calculateAmount(): number {
    // Replace with actual logic (based on meal type and days)
    return 500;
  }
}

// Utility
function checkIfDeliveringToday(order) {
  const today = new Date().getDay(); // 0 = Sunday
  const preferences = order.preferences || [];

  return preferences.some((pref) => pref.week_day === today);
}
