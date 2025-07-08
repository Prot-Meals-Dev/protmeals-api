// src/fleet-manager/fleet-manager.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { CreateCustomerOrderDto } from './dto/create-customer-order.dto';
import { meal_type_enum, order_status_enum } from '@prisma/client';
import { OrdersService } from 'src/orders/orders.service';
import { UpdateDeliverySequenceDto } from './dto/update-delivery-sequence.dto';
import * as dayjs from 'dayjs';
import { UpdateCustomerOrderDto } from './dto/update-customer-order.dto';
import { UpdatePartnerDetailsDto } from './dto/update-partner-details.dto';

@Injectable()
export class FleetManagerService {
  constructor(
    private readonly prisma: PrismaService,
    private ordersService: OrdersService,
  ) {}

  async createDeliveryPartner(dto: CreatePartnerDto, fleetManagerId: string) {
    const userExist = await this.prisma.users.findFirst({
      where: {
        email: dto.email,
      },
    });
    if (userExist) {
      throw new ConflictException('User with this email already exist');
    }
    const fleet_manager = await this.prisma.users.findFirst({
      where: { id: fleetManagerId },
    });
    if (!fleet_manager) {
      throw new NotFoundException('fleet manager not found');
    }
    const role = await this.prisma.roles.findFirst({
      where: { name: 'delivery_partner' },
    });

    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.users.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        role_id: role.id,
        region_id: fleet_manager.region_id,
        status: 'active',
      },
    });
  }

  async getOrdersByRegion(
    userId: string,
    deliveryPartnerId?: string,
    date?: string,
    status?: string,
  ) {
    const fleetManager = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!fleetManager) throw new NotFoundException('Fleet manager not found');

    const dateFilter = date ? new Date(date) : undefined;

    if (
      status &&
      !Object.values(order_status_enum).includes(status as order_status_enum)
    ) {
      throw new BadRequestException('Invalid order status');
    }

    const orders = await this.prisma.orders.findMany({
      where: {
        // user: {
        //   region_id: fleetManager.region_id,
        // },
        ...(status && { status: status as order_status_enum }),
        ...(dateFilter && {
          start_date: { lte: dateFilter },
          end_date: { gte: dateFilter },
        }),
        assignments: {
          some: {
            ...(deliveryPartnerId && {
              delivery_partner_id: deliveryPartnerId,
            }),
          },
        },
      },
      include: {
        user: true,
        meal_type: true,
        preferences: true,
        assignments: {
          where: deliveryPartnerId
            ? { delivery_partner_id: deliveryPartnerId }
            : {},
          include: {
            delivery_partner: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    console.log(orders);

    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    const formatted = orders.map((order) => {
      const recurringDays = [
        ...new Set(order.preferences.map((pref) => dayMap[pref.week_day])),
      ];

      const samplePref = order.preferences[0] ?? {
        breakfast: false,
        lunch: false,
        dinner: false,
      };

      const assignment = order.assignments[0];

      return {
        id: order.id,
        name: order.user.name,
        address: order.user.address,
        delivery_address: order.delevery_address,
        phone: order.user.phone,
        email: order.user.email,
        meal_type_id: order.meal_type_id,
        meal_type_name: order.meal_type?.name ?? null,
        start_date: dayjs(order.start_date).format('YYYY-MM-DD'),
        end_date: dayjs(order.end_date).format('YYYY-MM-DD'),
        recurring_days: recurringDays,
        delivery_partner_id: assignment?.delivery_partner_id ?? null,
        delivery_partner_name: assignment?.delivery_partner?.name ?? null,
        meal_preferences: {
          breakfast: samplePref.breakfast,
          lunch: samplePref.lunch,
          dinner: samplePref.dinner,
        },
        status: order.status,
        amount: Number(order.amount),
      };
    });

    return formatted;
  }

  async assignDelivery(dto: AssignDeliveryDto) {
    return this.prisma.delivery_assignments.create({
      data: {
        order_id: dto.orderId,
        meal_id: dto.mealTypeId,
        meal_type: dto.mealType,
        delivery_partner_id: dto.partnerId,
        assigned_by: dto.assignedBy,
        sequence: dto.sequence,
      },
    });
  }

  async createCustomerOrder(dto: CreateCustomerOrderDto, assignedBy: string) {
    const prisma = this.prisma;

    const DAY_MAP: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };

    // 1. Find or create customer
    let customer = await prisma.users.findUnique({
      where: { email: dto.email },
    });

    if (!customer) {
      const customerRole = await prisma.roles.findFirst({
        where: { name: 'customer' },
      });
      if (!customerRole) throw new NotFoundException('Customer role not found');

      customer = await prisma.users.create({
        data: {
          email: dto.email,
          name: dto.name,
          phone: dto.phone,
          address: dto.address,
          password: 'defaultPassword@123', // hash in production
          role: { connect: { id: customerRole.id } },
          status: 'active',
        },
      });
    }

    // 2. Validate meal type
    const mealType = await prisma.meal_types.findUnique({
      where: { id: dto.meal_type_id },
    });
    if (!mealType) throw new NotFoundException('Meal Type Not Found');

    const recurringDays = dto.recurring_days.map(
      (d) => DAY_MAP[d.toLowerCase()],
    );

    // 3. Calculate amount
    const amount = await this.ordersService.calculateAmount(
      mealType.id,
      dto.meal_preferences,
      dto.start_date,
      dto.end_date,
      recurringDays,
    );

    // 4. Count for sequence
    const activeOrders = await prisma.orders.count({
      where: {
        user_id: customer.id,
        status: { in: ['active', 'pending'] },
      },
    });
    const sequence = activeOrders + 1;

    // ✅ 5. Generate formatted order ID like ORD-0001
    const latestOrder = await prisma.orders.findFirst({
      orderBy: { created_at: 'desc' },
      select: { order_id: true },
      where: {
        order_id: {
          startsWith: 'ORD-',
        },
      },
    });

    let nextOrderNumber = 1;
    if (latestOrder?.order_id) {
      const match = latestOrder.order_id.match(/ORD-(\d+)/);
      if (match) {
        nextOrderNumber = parseInt(match[1]) + 1;
      }
    }
    const formattedOrderId = `ORD-${String(nextOrderNumber).padStart(4, '0')}`;

    // 6. Create order with order_id
    const order = await prisma.orders.create({
      data: {
        order_id: formattedOrderId,
        user_id: customer.id,
        delevery_address: dto.delivery_address,
        latitude: 0,
        longitude: 0,
        meal_type_id: dto.meal_type_id,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        amount,
        preferences: {
          create: recurringDays.map((day) => ({
            week_day: day,
            breakfast: dto.meal_preferences.breakfast,
            lunch: dto.meal_preferences.lunch,
            dinner: dto.meal_preferences.dinner,
          })),
        },
      },
      include: { preferences: true },
    });

    // 7. Validate delivery partner
    const deliveryPartner = await prisma.users.findFirst({
      where: {
        id: dto.delivery_partner_id,
        role: { name: 'delivery_partner' },
      },
    });
    if (!deliveryPartner)
      throw new NotFoundException('Delivery partner not found');

    // 8. Create delivery assignments
    const selectedMeals = ['breakfast', 'lunch', 'dinner'].filter(
      (meal) => dto.meal_preferences[meal as keyof typeof dto.meal_preferences],
    );

    await prisma.delivery_assignments.createMany({
      data: selectedMeals.map((meal) => ({
        order_id: order.id,
        meal_id: dto.meal_type_id,
        delivery_partner_id: dto.delivery_partner_id,
        meal_type: meal as meal_type_enum,
        sequence: sequence,
        assigned_by: assignedBy,
      })),
    });

    return order;
  }

  async updateDeliverySequences(
    partnerId: string,
    dto: UpdateDeliverySequenceDto,
  ) {
    for (const { order_id, new_sequence } of dto.orders) {
      await this.prisma.delivery_assignments.updateMany({
        where: {
          delivery_partner_id: partnerId,
          order_id,
        },
        data: {
          sequence: new_sequence,
        },
      });
    }

    return { message: 'Sequence updated successfully' };
  }

  async getFleetManagerAnalytics(managerId: string) {
    const today = dayjs().startOf('day').toDate();

    // 1. Get region
    const manager = await this.prisma.users.findUnique({
      where: { id: managerId },
      select: { region_id: true },
    });

    if (!manager?.region_id) {
      throw new Error('Fleet manager must belong to a region');
    }

    // 2. Get deliveries for today in this region
    const deliveries = await this.prisma.daily_deliveries.findMany({
      where: {
        delivery_date: today,
        partner: {
          region_id: manager.region_id,
        },
      },
      include: {
        assignment: {
          select: { meal_type: true },
        },
      },
    });

    // 3. Count meal types
    const mealCounts = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
    };

    deliveries.forEach((delivery) => {
      const meal = delivery.assignment?.meal_type;
      if (meal) mealCounts[meal]++;
    });

    // 4. Count total delivery partners in region
    const partnerCount = await this.prisma.users.count({
      where: {
        region_id: manager.region_id,
        role: { name: 'delivery_partner' },
      },
    });

    // 5. Count total orders in region
    const orderCount = await this.prisma.orders.count({
      where: {
        user: {
          region_id: manager.region_id,
        },
      },
    });

    return {
      todayDate: today,
      mealDeliveries: mealCounts,
      totalDeliveryPartners: partnerCount,
      totalOrders: orderCount,
      totalDeliveriesToday: deliveries.length,
    };
  }

  async updateCustomerOrder(orderId: string, dto: UpdateCustomerOrderDto) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        assignments: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Update delivery address in order
    if (dto.delivery_address) {
      await this.prisma.orders.update({
        where: { id: orderId },
        data: { delevery_address: dto.delivery_address },
      });
    }

    // Update user's phone and address
    if (dto.phone || dto.address) {
      await this.prisma.users.update({
        where: { id: order.user_id },
        data: {
          ...(dto.phone && { phone: dto.phone }),
          ...(dto.address && { address: dto.address }),
        },
      });
    }

    // Update delivery partner
    if (dto.delivery_partner_id) {
      const partner = await this.prisma.users.findFirst({
        where: {
          id: dto.delivery_partner_id,
          role: { name: 'delivery_partner' },
        },
      });

      if (!partner) throw new NotFoundException('Delivery partner not found');

      await this.prisma.delivery_assignments.updateMany({
        where: { order_id: orderId },
        data: { delivery_partner_id: dto.delivery_partner_id },
      });
    }

    return {
      orderId,
    };
  }

  async updatePartnerDetails(partnerId: string, dto: UpdatePartnerDetailsDto) {
    const partner = await this.prisma.users.findFirst({
      where: {
        id: partnerId,
        role: { name: 'delivery_partner' },
      },
    });

    if (!partner) {
      throw new NotFoundException('Delivery partner not found');
    }

    return this.prisma.users.update({
      where: { id: partnerId },
      data: dto,
    });
  }

  async getAllRegionDeliveries(managerId: string, date?: string) {
    const today = date ? new Date(date) : undefined;

    const manager = await this.prisma.users.findUnique({
      where: { id: managerId },
      select: { region_id: true },
    });

    if (!manager?.region_id) {
      throw new NotFoundException('Fleet manager region not found');
    }

    const whereCondition: any = {
      partner: {
        region_id: manager.region_id,
      },
    };

    if (today) {
      whereCondition.delivery_date = dayjs(today).startOf('day').toDate();
    }

    return this.prisma.daily_deliveries.findMany({
      where: whereCondition,
      orderBy: {
        sequence: 'asc',
      },
      include: {
        user: {
          select: {
            name: true,
            phone: true,
            address: true,
          },
        },
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignment: {
          select: {
            order_id: true,
            meal_type: true,
            meal: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async getPartnerOrdersInSequence(partnerId: string) {
    // Fetch the earliest assignment per order for the partner
    const assignments = await this.prisma.delivery_assignments.findMany({
      where: {
        delivery_partner_id: partnerId,
      },
      orderBy: {
        sequence: 'asc',
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                name: true,
                phone: true,
                address: true,
              },
            },
            meal_type: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Group by order_id to avoid duplicate orders
    const seen = new Set();
    const uniqueAssignments = assignments.filter((a) => {
      if (seen.has(a.order_id)) return false;
      seen.add(a.order_id);
      return true;
    });

    return uniqueAssignments.map((a) => ({
      order_id: a.order_id,
      sequence: a.sequence,
      meal_type: a.meal_type,
      order: a.order,
    }));
  }
}
