import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as dayjs from 'dayjs';
import { meal_type_enum, order_status_enum } from '@prisma/client';

@Injectable()
export class DeliveryCronService {
  private readonly logger = new Logger(DeliveryCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async assignBreakfastDeliveries() {
    await this.generateDailyDeliveries('breakfast');
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async assignLunchDeliveries() {
    await this.generateDailyDeliveries('lunch');
  }

  @Cron(CronExpression.EVERY_DAY_AT_4PM)
  async assignDinnerDeliveries() {
    await this.generateDailyDeliveries('dinner');
  }

  private async generateDailyDeliveries(mealType: meal_type_enum) {
    const today = dayjs().startOf('day').toDate();
    const weekday = dayjs().day(); // Sunday = 0

    this.logger.log(
      `📦 Generating ${mealType} deliveries for ${today.toDateString()}`,
    );

    const assignments = await this.prisma.delivery_assignments.findMany({
      where: {
        meal_type: mealType,
        order: {
          status: order_status_enum.active,
          start_date: { lte: today },
          end_date: { gte: today },
          preferences: {
            some: {
              week_day: weekday,
              [mealType]: true,
            },
          },
        },
      },
      include: {
        order: true,
      },
    });

    this.logger.debug(
      `Found ${assignments.length} valid ${mealType} assignments for today`,
    );

    for (const assignment of assignments) {
      const exists = await this.prisma.daily_deliveries.findFirst({
        where: {
          delivery_assignments_id: assignment.id,
          delivery_date: today,
        },
      });

      if (exists) {
        this.logger.debug(
          `🟡 Delivery already generated for assignment ${assignment.id}`,
        );
        continue;
      }

      await this.prisma.daily_deliveries.create({
        data: {
          user_id: assignment.order.user_id,
          delivery_partner_id: assignment.delivery_partner_id,
          delivery_assignments_id: assignment.id,
          delivery_date: today,
          sequence: assignment.sequence,
          status: 'pending', 
        },
      });

      this.logger.log(
        `✅ Created ${mealType} delivery for order ${assignment.order_id} → partner ${assignment.delivery_partner_id}`,
      );
    }

    this.logger.log(`🎯 Completed generating ${mealType} deliveries`);
  }
}
