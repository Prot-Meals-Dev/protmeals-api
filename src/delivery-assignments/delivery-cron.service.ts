// delivery-cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as dayjs from 'dayjs';

const MAX_DAILY_CAPACITY = 10;

@Injectable()
export class DeliveryCronService {
  private readonly logger = new Logger(DeliveryCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async assignDailyDeliveries() {
    const today = dayjs().startOf('day').toDate();
    const weekday = today.getDay(); // 0 = Sunday

    this.logger.log(`Starting delivery assignment for ${today.toDateString()}`);

    const orders = await this.prisma.orders.findMany({
      where: {
        status: 'active',
        start_date: { lte: today },
        end_date: { gte: today },
        preferences: {
          some: { week_day: weekday },
        },
        user: {
          region_id: { not: null },
        },
      },
      include: {
        user: true,
        preferences: true,
        meal_type: true,
      },
    });

    let sequence = 1;

    for (const order of orders) {
      const regionId = order.user.region_id!;
      const partners = await this.prisma.users.findMany({
        where: {
          role: { name: 'delivery_partner' },
          status: 'active',
          region_id: regionId,
        },
      });

      // Get current delivery count per partner for today
      const deliveriesToday = await this.prisma.daily_deliveries.groupBy({
        by: ['delivery_partner_id'],
        where: { delivery_date: today },
        _count: true,
      });

      const partnerLoadMap = new Map<string, number>();
      deliveriesToday.forEach((d) => {
        partnerLoadMap.set(d.delivery_partner_id, d._count);
      });

      for (const pref of order.preferences) {
        const meals: ('breakfast' | 'lunch' | 'dinner')[] = [];
        if (pref.breakfast) meals.push('breakfast');
        if (pref.lunch) meals.push('lunch');
        if (pref.dinner) meals.push('dinner');

        for (const meal of meals) {
          // Find least loaded partner in this region
          const eligiblePartner = partners.find((p) => {
            const load = partnerLoadMap.get(p.id) ?? 0;
            return load < MAX_DAILY_CAPACITY;
          });

          if (!eligiblePartner) {
            this.logger.warn(
              `No available partner for region ${regionId} on ${today} for meal ${meal}`,
            );
            continue;
          }

          // Create assignment and delivery
          const assignment = await this.prisma.delivery_assignments.create({
            data: {
              order_id: order.id,
              meal_id: order.meal_type_id!,
              delivery_partner_id: eligiblePartner.id,
              meal_type: meal,
              sequence,
            },
          });

          await this.prisma.daily_deliveries.create({
            data: {
              user_id: order.user_id,
              delivery_partner_id: eligiblePartner.id,
              delivery_date: today,
              delivery_assignments_id: assignment.id,
              sequence,
            },
          });

          partnerLoadMap.set(
            eligiblePartner.id,
            (partnerLoadMap.get(eligiblePartner.id) ?? 0) + 1,
          );

          sequence++;
        }
      }
    }

    this.logger.log(
      `Completed delivery assignment with ${sequence - 1} entries.`,
    );
  }
}
