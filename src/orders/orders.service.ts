import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from 'src/payments/payments.service';
import { CreateOrderDto, CustomerCreateOrderDto } from './dto/create-order.dto';
import {
  meal_type_enum,
  order_status_enum,
  payment_status_enum,
  payment_type_enum,
} from '@prisma/client';
import { FilterOrdersDto } from './dto/filter-orders.dto';
import { CustomerFilterOrdersDto } from './dto/customer-filter-orders.dto';
const dayjs = require('dayjs');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');

dayjs.extend(isSameOrBefore);

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private payments: PaymentsService,
  ) {}

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
        assignments: {
          include: {
            delivery_partner: true,
          },
        },
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
    const order = await this.prisma.orders.findUnique({
      where: { id },
      include: {
        user: true,
        meal_type: true,
        preferences: true,
        coupon: true,
        order_pauses: true,
      },
    });

    if (!order) {
      throw new Error(`Order with id ${id} not found`);
    }

    return order;
  } 

  async findByUser(userId: string) {
    return this.prisma.orders.findMany({
      where: { user_id: userId },
      include: { meal_type: true },
    });
  }

  async findCustomerOrders(
    customerId: string,
    filters: CustomerFilterOrdersDto,
  ) {
    // Verify customer exists and is a customer
    const customer = await this.prisma.users.findUnique({
      where: { id: customerId },
      include: { role: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (customer.role.name !== 'customer') {
      throw new ForbiddenException('This endpoint is only for customers');
    }

    const { startDate, endDate, status, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      user_id: customerId,
    };

    if (startDate) {
      where.start_date = {
        ...where.start_date,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.end_date = {
        ...where.end_date,
        lte: new Date(endDate),
      };
    }

    if (status) {
      where.status = status;
    }

    // Get total count and orders
    const [total, orders] = await Promise.all([
      this.prisma.orders.count({ where }),
      this.prisma.orders.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          meal_type: {
            select: {
              id: true,
              name: true,
              breakfast_price: true,
              lunch_price: true,
              dinner_price: true,
            },
          },
          preferences: true,
          assignments: {
            include: {
              delivery_partner: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: orders.map((order) => ({
        id: order.id,
        order_id: order.order_id,
        delivery_address: order.delevery_address,
        start_date: order.start_date,
        end_date: order.end_date,
        amount: order.amount,
        status: order.status,
        meal_type: order.meal_type,
        preferences: order.preferences,
        delivery_partners: order.assignments.map((assignment) => ({
          meal_type: assignment.meal_type,
          partner: assignment.delivery_partner,
        })),
        created_at: order.created_at,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(id: string, status: order_status_enum, userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    const order = await this.prisma.orders.findUnique({
      where: { id },
      include: {
        assignments: true,
        preferences: true,
        user: true, // needed to get user's region
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    // 🚫 Restrict fleet_manager from accessing orders outside their region
    if (user.role.name === 'fleet_manager') {
      const orderRegion = order.user.region_id;
      if (!orderRegion || user.region_id !== orderRegion) {
        throw new ForbiddenException(
          'You are not authorized to modify this order',
        );
      }
    }

    const today = new Date();

    // ✅ Update order status
    await this.prisma.orders.update({
      where: { id },
      data: { status },
    });

    // 🧹 Handle paused/cancelled/completed: delete future deliveries
    if (['paused', 'cancelled', 'completed'].includes(status)) {
      await this.prisma.daily_deliveries.deleteMany({
        where: {
          delivery_date: { gt: today },
          delivery_assignments_id: {
            in: order.assignments.map((a) => a.id),
          },
        },
      });
    }

    // 🔁 Handle resume: regenerate future deliveries
    if (status === 'active' && order.end_date > today) {
      const daysToGenerate: Date[] = [];

      for (
        let d = new Date(today);
        d <= order.end_date;
        d.setDate(d.getDate() + 1)
      ) {
        const pref = order.preferences.find((p) => p.week_day === d.getDay());
        if (pref) daysToGenerate.push(new Date(d));
      }

      for (const date of daysToGenerate) {
        for (const assignment of order.assignments) {
          await this.prisma.daily_deliveries.create({
            data: {
              delivery_date: date,
              delivery_assignments_id: assignment.id,
              user_id: order.user_id,
              meal_type: assignment.meal_type,
              delivery_partner_id: assignment.delivery_partner_id,
              order_id: order.id,
              sequence: assignment.sequence,
            },
          });
        }
      }
    }

    return {
      orderId: id,
      newStatus: status,
      message: `Order status updated to ${status}`,
    };
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

  async createCustomerOrder(data: CustomerCreateOrderDto, customerId: string) {
    // Validate customer exists
    const customer = await this.prisma.users.findUnique({
      where: { id: customerId },
      include: { role: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (customer.role.name !== 'customer') {
      throw new ForbiddenException(
        'Only customers can create orders through this endpoint',
      );
    }

    // Calculate amount
    const amount = await this.calculateAmount(
      data.meal_type_id,
      data.meal_preferences,
      data.start_date,
      data.end_date,
      data.recurring_days,
    );

    // Generate new order_id
    const latestOrder = await this.prisma.orders.findFirst({
      orderBy: { created_at: 'desc' },
      select: { order_id: true },
      where: {
        order_id: {
          startsWith: 'ORD-',
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

    // If payment_type present or defaulting to one_time, integrate checkout here
    const order = await this.prisma.orders.create({
      data: {
        order_id: formattedOrderId,
        user_id: customerId,
        delevery_address: data.delivery_address,
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        meal_type_id: data.meal_type_id,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        amount,
        status: order_status_enum.pending,
        payment_status: payment_status_enum.pending,
        preferences: {
          create: data.recurring_days.map((day) => ({
            week_day: day,
            breakfast: data.meal_preferences.breakfast,
            lunch: data.meal_preferences.lunch,
            dinner: data.meal_preferences.dinner,
          })),
        },
      },
      include: {
        user: true,
      },
    });

    // Create a pending transaction
    const paymentType: payment_type_enum =
      (data.payment_type as payment_type_enum) || payment_type_enum.one_time;
    const txn = await this.prisma.transactions.create({
      data: {
        order_id: order.id,
        user_id: customerId,
        amount,
        currency: process.env.RAZORPAY_CURRENCY || 'INR',
        payment_type: paymentType as any,
        status: 'pending',
        provider: 'razorpay',
        // Razorpay receipt max length 40. Use compact id (no hyphens).
        receipt: `rcpt_${order.id.replace(/-/g, '').slice(0, 32)}`,
        notes: { orderId: order.id, userId: customerId },
      },
    });

    // Create Razorpay order and return checkout payload
    const rpOrder = await this.payments.createRazorpayOrder(
      amount,
      txn.receipt!,
      { transactionId: txn.id },
    );

    await this.prisma.transactions.update({
      where: { id: txn.id },
      data: { provider_order_id: rpOrder.id },
    });

    return {
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpay_order_id: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      name: 'ProtMeals',
      description: 'Meal plan payment',
      prefill: {
        name: order.user?.name,
        email: order.user?.email,
        contact: order.user?.phone,
      },
      notes: rpOrder.notes,
      transactionId: txn.id,
      order_id: order.order_id,
    };
  }

  // Deprecated: handled by createCustomerOrder now
  async createCustomerCheckout(
    data: CustomerCreateOrderDto,
    customerId: string,
  ) {
    // Validate and compute amount (reusing logic)
    const amount = await this.calculateAmount(
      data.meal_type_id,
      data.meal_preferences,
      data.start_date,
      data.end_date,
      data.recurring_days,
    );

    // Create a pending order (not active, payment pending)
    const order = await this.prisma.orders.create({
      data: {
        user_id: customerId,
        delevery_address: data.delivery_address,
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        meal_type_id: data.meal_type_id,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        amount,
        status: order_status_enum.pending,
        payment_status: payment_status_enum.pending,
        preferences: {
          create: data.recurring_days.map((day) => ({
            week_day: day,
            breakfast: data.meal_preferences.breakfast,
            lunch: data.meal_preferences.lunch,
            dinner: data.meal_preferences.dinner,
          })),
        },
      },
      include: {
        user: true,
      },
    });

    // Create a pending transaction
    const txn = await this.prisma.transactions.create({
      data: {
        order_id: order.id,
        user_id: customerId,
        amount,
        currency: process.env.RAZORPAY_CURRENCY || 'INR',
        payment_type: 'one_time',
        status: 'pending',
        provider: 'razorpay',
        // Razorpay receipt max length 40. Use compact id (no hyphens).
        receipt: `rcpt_${order.id.replace(/-/g, '').slice(0, 32)}`,
        notes: {
          orderId: order.id,
          userId: customerId,
        },
      },
    });

    // Create Razorpay order
    const rpOrder = await this.payments.createRazorpayOrder(
      amount,
      txn.receipt!,
      {
        transactionId: txn.id,
      },
    );

    // Save provider order id
    await this.prisma.transactions.update({
      where: { id: txn.id },
      data: { provider_order_id: rpOrder.id } as any,
    });

    // Return checkout payload
    return {
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpay_order_id: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      name: 'ProtMeals',
      description: 'Meal plan payment',
      prefill: {
        name: order.user?.name,
        email: order.user?.email,
        contact: order.user?.phone,
      },
      notes: rpOrder.notes,
      transactionId: txn.id,
    };
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

  async pauseOrderOnDays(orderId: string, dates: Date[], userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Region check for fleet managers
    if (
      user.role.name === 'fleet_manager' &&
      order.user.region_id !== user.region_id
    ) {
      throw new ForbiddenException('Unauthorized access to this order');
    }

    // Delete daily deliveries for specified dates
    await this.prisma.daily_deliveries.deleteMany({
      where: {
        order_id: orderId,
        delivery_date: {
          in: dates,
        },
      },
    });

    // Log pauses (optional)
    const pauseLogs = dates.map((date) => ({
      order_id: orderId,
      pause_date: date,
    }));

    await this.prisma.order_pauses.createMany({
      data: pauseLogs,
      skipDuplicates: true,
    });

    return {
      message: `Order paused on ${dates.map((d) => d.toDateString()).join(', ')}`,
      pausedDates: dates,
    };
  }
}

// Utility
function checkIfDeliveringToday(order: {
  preferences?: { week_day: number }[];
}) {
  const today = new Date().getDay(); // 0 = Sunday
  return order.preferences?.some((pref) => pref.week_day === today) ?? false;
}
