import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrdersService } from 'src/orders/orders.service';

@Injectable()
export class DeliveryCronService {
  private readonly logger = new Logger(DeliveryCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyDeliveryGeneration() {
    const today = DateTime.now().toISODate(); // e.g., "2025-07-29"
    await this.runDailyCron(today);
  }

  async runDailyCron(dateISO?: string) {
    const target = dateISO || DateTime.now().toISODate();

    // 0. Mark orders whose end_date has passed as completed (yesterday and before)
    await this.ordersService.completeExpiredOrders(target);

    // 1. Mark expired coupons
    await this.expireOldCoupons(target);

    // 2. Generate daily deliveries (excluding paused orders)
    await this.generateDailyDeliveries(target);

    // 3. Immediately mark orders that end today as completed (after generating today's deliveries)
    await this.ordersService.completeOrdersEndingOn(target);

    this.logger.log(
      `Daily cron ran for ${target}: completed expired orders, expired coupons, generated deliveries, and completed today's ending orders`,
    );
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

  async generateDailyDeliveries(today: string) {
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

import { Controller, Post, Body } from '@nestjs/common';

@Controller('deliveries')
export class DeliveryController {
  constructor(private readonly deliveryCronService: DeliveryCronService) {}

  @Post('generate')
  async manualGenerate(@Body('date') date?: string) {
    // Default to today if no date passed
    const targetDate = date
      ? DateTime.fromISO(date).toISODate()
      : DateTime.now().toISODate();

    const result =
      await this.deliveryCronService.generateDailyDeliveries(targetDate);

    return {
      message: `Daily deliveries generated for ${targetDate}`,
      result,
    };
  }

  @Post('cron/run')
  async manualRunCron(@Body('date') date?: string) {
    const targetDate = date
      ? DateTime.fromISO(date).toISODate()
      : DateTime.now().toISODate();
    await this.deliveryCronService.runDailyCron(targetDate);
    return { message: `Daily cron executed for ${targetDate}` };
  }
}
