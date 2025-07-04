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

@Injectable()
export class FleetManagerService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getOrdersByRegion(userId: string) {
    const fleet_manager = await this.prisma.users.findFirst({
      where: { id: userId },
    });
    return this.prisma.orders.findMany({
      where: {
        user: { region_id: fleet_manager.region_id },
      },
      include: {
        user: true,
        meal_type: true,
      },
    });
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

      if (!customerRole) {
        throw new NotFoundException('Customer role not found');
      }

      customer = await prisma.users.create({
        data: {
          email: dto.email,
          name: dto.name,
          phone: dto.phone,
          address: dto.address,
          password: 'defaultPassword@123', // consider hashing
          role: { connect: { id: customerRole.id } },
          status: 'active',
        },
      });
    }

    // 2. Validate meal type
    const mealType = await prisma.meal_types.findFirst({
      where: { id: dto.meal_type_id },
    });

    if (!mealType) {
      throw new NotFoundException('Meal Type Not Found');
    }

    // 3. Count existing active orders for sequence
    const activeOrders = await prisma.orders.count({
      where: {
        user_id: customer.id,
        status: { in: ['active', 'pending'] },
      },
    });

    const sequence = activeOrders + 1;

    // 4. Create order with preferences
    const order = await prisma.orders.create({
      data: {
        user_id: customer.id,
        delevery_address: dto.delivery_address,
        latitude: 0,
        longitude: 0,
        meal_type_id: dto.meal_type_id,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        amount: 500, // hardcoded for now
        preferences: {
          create: dto.recurring_days.map((day) => ({
            week_day: DAY_MAP[day.toLowerCase()],
            breakfast: dto.meal_preferences.breakfast,
            lunch: dto.meal_preferences.lunch,
            dinner: dto.meal_preferences.dinner,
          })),
        },
      },
      include: { preferences: true },
    });

    // 5. Validate delivery partner
    const deliveryPartner = await prisma.users.findFirst({
      where: {
        id: dto.delivery_partner_id,
        role: { name: 'delivery_partner' },
      },
    });

    if (!deliveryPartner) {
      throw new NotFoundException('Delivery partner not found or invalid');
    }

    // 6. Determine meal type for assignment (defaults to lunch)
    const selectedMealType = (['breakfast', 'lunch', 'dinner'].find(
      (m) => dto.meal_preferences[m as keyof typeof dto.meal_preferences],
    ) || 'lunch') as meal_type_enum;

    // 7. Create delivery assignment
    await prisma.delivery_assignments.create({ 
      data: {
        order: { connect: { id: order.id } },
        meal: { connect: { id: dto.meal_type_id } },
        delivery_partner: { connect: { id: dto.delivery_partner_id } },
        meal_type: selectedMealType,
        sequence,
        assigned_by_user: { connect: { id: assignedBy } },
      },
    });

    return order;
  }
}
