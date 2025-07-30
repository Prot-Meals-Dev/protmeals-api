import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DeliveryCronService {
  private readonly logger = new Logger(DeliveryCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleDailyDeliveryGeneration() {
    const today = DateTime.now().toISODate(); // e.g., "2025-07-29"

    // 1. Mark expired coupons
    await this.expireOldCoupons(today);

    // 2. Generate daily deliveries (excluding paused orders)
    await this.generateDailyDeliveries(today);

    this.logger.log(`Daily delivery and coupon expiry cron ran for ${today}`);
  }

  private async expireOldCoupons(today: string) {
    const result = await this.prisma.coupons.updateMany({
      where: {
        expires_at: { lt: new Date(today) },
        status: 'active',
      },
      data: {
        status: 'expired',
      },
    });
    this.logger.log(`Expired ${result.count} old coupons`);
  }

  private async generateDailyDeliveries(today: string) {
    // 1. Fetch valid delivery assignments
    const assignments = await this.prisma.delivery_assignments.findMany({
      where: {
        order: {
          status: 'active',
          order_pauses: {
            none: { pause_date: new Date(today) }, // No pause for today
          },
          start_date: { lte: new Date(today) },
          end_date: { gte: new Date(today) },
        },
      },
      include: {
        order: true,
      },
    });

    let deliveriesCreated = 0;

    for (const assignment of assignments) {
      const { order_id, delivery_partner_id, meal_type } = assignment;

      // Skip if already generated
      const existing = await this.prisma.daily_deliveries.findFirst({
        where: {
          delivery_date: new Date(today),
          order_id,
          meal_type,
        },
      });

      if (existing) continue;

      await this.prisma.daily_deliveries.create({
        data: {
          delivery_partner_id,
          order_id,
          user_id: assignment.order.user_id,
          delivery_date: new Date(today),
          status: 'pending',
          meal_type,
          delivery_assignments_id: assignment.id,
          sequence: 0, // You may override later
        },
      });

      deliveriesCreated++;
    }

    this.logger.log(`Created ${deliveriesCreated} deliveries for ${today}`);
  }
}
