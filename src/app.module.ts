// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ScheduleModule } from '@nestjs/schedule';
import { OrdersModule } from './orders/orders.module';
import { FleetManagerModule } from './fleet-manager/fleet-manager.module';
import { MealTypesModule } from './meal_types/meal_types.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { DeliveryAssignmentsModule } from './delivery-assignments/delivery-assignments.module';
import { RegionsModule } from './regions/regions.module';
import { CouponsModule } from './coupons/coupons.module';
import { AdminModule } from './admin/admin.module';
import { WeeklyMenuModule } from './weekly-menu/weekly-menu.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env${process.env.NODE_ENV === 'test' ? '.test' : ''}`,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FleetManagerModule,
    ScheduleModule.forRoot(),
    OrdersModule,
    MealTypesModule,
    DeliveryAssignmentsModule,
    PrismaModule,
    RegionsModule,
    CouponsModule,
    AdminModule,
    WeeklyMenuModule,
    AnalyticsModule,
    PaymentsModule,
    MailModule,
  ],
})
export class AppModule {}
