import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import { DeliveryItemStatus } from './dto/update-status.dto';
import { delivery_item_status_enum, meal_type_enum } from '@prisma/client';

dayjs.extend(utc);

@Injectable()
export class DeliveryAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPartnerDeliveries(
    partnerId: string,
    date?: string,
    status?: delivery_item_status_enum,
    mealType?: meal_type_enum,
  ) {
    const where: any = {
      delivery_partner_id: partnerId,
    };
    console.log(date);
    // Optional date filter
    if (date) {
      const parsedDate = dayjs.utc(date);
      if (!parsedDate.isValid()) {
        throw new BadRequestException('Invalid date format');
      }
      where.delivery_date = parsedDate.startOf('day').toDate();
      console.log(where.delivery_date);
    }

    // Optional status filter
    if (status) {
      if (!Object.values(delivery_item_status_enum).includes(status)) {
        throw new BadRequestException('Invalid delivery status value');
      }
      where.status = status;
    }

    // Optional meal type filter (nested under assignment)
    if (mealType) {
      if (!Object.values(meal_type_enum).includes(mealType)) {
        throw new BadRequestException('Invalid meal type value');
      }

      where.assignment = {
        meal_type: mealType,
      };
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
    const tomorrow = dayjs().endOf('day').toDate();

    const [
      totalAssigned,
      todayDeliveries,
      todayCompleted,
      totalCompletedDeliveries,
      breakdown,
      todayCompletedBreakdown,
    ] = await Promise.all([
      // 1️⃣ Total assignments for this partner
      this.prisma.delivery_assignments.count({
        where: { delivery_partner_id: partnerId },
      }),

      // 2️⃣ Total deliveries assigned today
      this.prisma.daily_deliveries.count({
        where: {
          delivery_partner_id: partnerId,
          delivery_date: {
            gte: today,
            lte: tomorrow,
          },
        },
      }),

      // 3️⃣ Total deliveries completed today
      this.prisma.daily_deliveries.count({
        where: {
          delivery_partner_id: partnerId,
          delivery_date: {
            gte: today,
            lte: tomorrow,
          },
          status: 'delivered',
        },
      }),

      // 4️⃣ Total completed deliveries overall
      this.prisma.daily_deliveries.count({
        where: {
          delivery_partner_id: partnerId,
          status: 'delivered',
        },
      }),

      // 5️⃣ Meal type breakdown (all assignments)
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

      // 6️⃣ Today's completed deliveries breakdown (breakfast/lunch/dinner)
      this.prisma.daily_deliveries.groupBy({
        by: ['meal_type'],
        where: {
          delivery_partner_id: partnerId,
          delivery_date: {
            gte: today,
            lte: tomorrow,
          },
          status: 'delivered',
        },
        _count: true,
      }),
    ]);

    // Build normal breakdown (assigned)
    const breakdownObj = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
    };

    breakdown.forEach((b) => {
      breakdownObj[b.meal_type] = b._count;
    });

    // Build today's completed breakdown
    const todayCompletedBreakdownObj = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
    };

    todayCompletedBreakdown.forEach((b) => {
      todayCompletedBreakdownObj[b.meal_type] = b._count;
    });

    return {
      totalAssigned,
      todayDeliveries,
      todayCompleted,
      totalCompletedDeliveries,
      breakdown: breakdownObj,
      todayCompletedBreakdown: todayCompletedBreakdownObj, // 👈 new field
    };
  }

  async getAssignedOrdersForPartner(partnerId: string) {
    const assignments = await this.prisma.delivery_assignments.findMany({
      where: {
        delivery_partner_id: partnerId,
      },
      include: {
        order: {
          include: {
            user: true,
            preferences: true,
          },
        },
      },
    });

    const groupedByOrder = new Map();

    for (const assignment of assignments) {
      const { order } = assignment;
      const orderId = order.id;

      if (!groupedByOrder.has(orderId)) {
        const mealTypes = [];
        const preferencesByWeekDay = new Map();

        for (const pref of order.preferences) {
          const day = pref.week_day;
          preferencesByWeekDay.set(day, {
            breakfast: pref.breakfast,
            lunch: pref.lunch,
            dinner: pref.dinner,
          });
        }

        // Flatten days and active meal types
        const allDays = [...preferencesByWeekDay.entries()];
        const days = allDays.map(([day]) => this.getDayLabel(day));
        const activeMeals = ['Breakfast', 'Lunch', 'Dinner'].filter((meal, i) =>
          allDays.some(([, meals]) => meals[meal.toLowerCase()]),
        );

        groupedByOrder.set(orderId, {
          userName: order.user.name,
          meals: activeMeals,
          type: 'Recurring', // You can modify this based on logic
          days,
        });
      }
    }

    return Array.from(groupedByOrder.values());
  }

  private getDayLabel(day: number): string {
    const map = ['S', 'M', 'T', 'W', 'TH', 'F', 'S'];
    return map[day % 7];
  }
}
