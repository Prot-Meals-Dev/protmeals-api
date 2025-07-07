import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as dayjs from 'dayjs';
import { DeliveryItemStatus } from './dto/update-status.dto';

@Injectable()
export class DeliveryAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPartnerDeliveries(partnerId: string, date?: string) {
    const where: any = {
      delivery_partner_id: partnerId,
    };

    if (date) {
      const deliveryDate = new Date(date);
      where.delivery_date = deliveryDate;
    }

    return this.prisma.daily_deliveries.findMany({
      where,
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
            phone: true,
          },
        },
        assignment: {
          select: {
            meal_type: true,
            meal: {
              select: {
                name: true,
              },
            },
          },
        },
        order: {
          select: {
            order_id: true,
            delevery_address: true,
            start_date: true,
            end_date: true,
            amount: true,
            status: true,
            created_at: true,
          },
        },
      },
    });
  }

  async getDeliveryPartnerAnalytics(partnerId: string) {
    const today = dayjs().startOf('day').toDate();

    const [totalAssigned, todayDeliveries, todayCompleted, breakdown] =
      await Promise.all([
        this.prisma.delivery_assignments.count({
          where: { delivery_partner_id: partnerId },
        }),

        this.prisma.daily_deliveries.count({
          where: {
            delivery_partner_id: partnerId,
            delivery_date: today,
          },
        }),

        this.prisma.daily_deliveries.count({
          where: {
            delivery_partner_id: partnerId,
            delivery_date: today,
            status: 'delivered',
          },
        }),

        this.prisma.delivery_assignments.groupBy({
          by: ['meal_type'],
          where: {
            delivery_partner_id: partnerId,
            order: {
              start_date: { lte: today },
              end_date: { gte: today },
            },
          },
          _count: true,
        }),
      ]);

    const breakdownObj = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
    };

    breakdown.forEach((b) => {
      breakdownObj[b.meal_type] = b._count;
    });

    return {
      totalAssigned,
      todayDeliveries,
      todayCompleted,
      breakdown: breakdownObj,
    };
  }
}
