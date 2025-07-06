import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as dayjs from 'dayjs';
import { DeliveryItemStatus } from './dto/update-status.dto';

@Injectable()
export class DeliveryAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPartnerDeliveries(partnerId: string, date?: string) {
    const deliveryDate = new Date(date);
    console.log(deliveryDate);
    return this.prisma.daily_deliveries.findMany({
      where: {
        delivery_partner_id: partnerId,
        delivery_date: deliveryDate,
      },
      orderBy: {
        sequence: 'asc',
      },
      include: {
        user: {
          select: {
            name: true,
            address: true,
          },
        },
        assignment: {
          select: {
            order_id: true,
            meal_type: true,
          },
        },
      },
    });
  }

  async updateDeliveryStatus(
    id: string,
    status: DeliveryItemStatus,
    partnerId: string,
  ) {
    const existing = await this.prisma.daily_deliveries.findFirst({
      where: {
        id,
        delivery_partner_id: partnerId,
      },
    });

    if (!existing) return null;

    await this.prisma.daily_deliveries.update({
      where: { id },
      data: { status },
    });

    return true;
  }

  async getDeliveryDetail(id: string, partnerId: string) {
    return this.prisma.daily_deliveries.findFirst({
      where: {
        id,
        delivery_partner_id: partnerId,
      },
      include: {
        user: {
          select: {
            name: true,
            address: true,
            phone: true,
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
