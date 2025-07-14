import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import { meal_type_enum, order_status_enum } from '@prisma/client';

// Extend dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class DeliveryCronService {
  private readonly logger = new Logger(DeliveryCronService.name);
  private readonly TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateAllDailyDeliveries() {
    const mealTypes: meal_type_enum[] = [
      meal_type_enum.breakfast,
      meal_type_enum.lunch,
      meal_type_enum.dinner,
    ];

    for (const mealType of mealTypes) {
      await this.generateDailyDeliveries(mealType);
    }
  }

  private async generateDailyDeliveries(mealType: meal_type_enum) {
    const now = dayjs().tz(this.TIMEZONE);
    const today = now.endOf('day').toDate(); // ✅ JavaScript Date at local midnight
    const weekday = now.day(); // ✅ Correct weekday

    this.logger.log(
      `📦 Generating ${mealType} deliveries for ${today.toISOString()} (${this.TIMEZONE})`,
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
          delivery_date: today, // ✅ valid Date object (not string)
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
          order_id: assignment.order.id,
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
