// src/fleet-manager/fleet-manager.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { CreateCustomerOrderDto } from './dto/create-customer-order.dto';
import { meal_type_enum } from '@prisma/client';
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

  async getOrdersByRegion(userId: string, deliveryPartnerId?: string) {
    const fleetManager = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!fleetManager) throw new NotFoundException('Fleet manager not found');

    // 1. Get all orders in the region with filtered assignments
    const orders = await this.prisma.orders.findMany({
      where: {
        user: { region_id: fleetManager.region_id },
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
        assignments: {
          where: deliveryPartnerId
            ? { delivery_partner_id: deliveryPartnerId }
            : {},
        },
      },
    });

    // 2. Sort in memory by the lowest sequence of each order's assignments
    orders.sort((a, b) => {
      const seqA = a.assignments[0]?.sequence ?? Infinity;
      const seqB = b.assignments[0]?.sequence ?? Infinity;
      return seqA - seqB;
    });

    return orders;
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
      include: { preferences: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    const updateData: any = {};

    if (dto.delivery_address)
      updateData.delevery_address = dto.delivery_address;
    if (dto.start_date) updateData.start_date = new Date(dto.start_date);
    if (dto.end_date) updateData.end_date = new Date(dto.end_date);

    // Update preferences
    if (dto.meal_preferences || dto.recurring_days) {
      await this.prisma.order_meal_preferences.deleteMany({
        where: { order_id: orderId },
      });

      const DAY_MAP: Record<string, number> = {
        sun: 0,
        mon: 1,
        tue: 2,
        wed: 3,
        thu: 4,
        fri: 5,
        sat: 6,
      };

      const days =
        dto.recurring_days?.map((d) => DAY_MAP[d.toLowerCase()]) ?? [];
      const prefs = {
        breakfast: dto.meal_preferences?.breakfast ?? false,
        lunch: dto.meal_preferences?.lunch ?? false,
        dinner: dto.meal_preferences?.dinner ?? false,
      };

      updateData.preferences = {
        create: days.map((day) => ({
          week_day: day,
          breakfast: prefs.breakfast,
          lunch: prefs.lunch,
          dinner: prefs.dinner,
        })),
      };
    }

    return this.prisma.orders.update({
      where: { id: orderId },
      data: updateData,
      include: { preferences: true },
    });
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
}
