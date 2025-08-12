import { Injectable } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { readdirSync } from 'fs';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummaryAnalytics(startDate: Date, endDate: Date) {
    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);
    rangeEnd.setHours(23, 59, 59);

    const yesterdayStart = new Date(startDate);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0);

    const yesterdayEnd = new Date(startDate);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    yesterdayEnd.setHours(23, 59, 59);

    const [revenue, yesterdayRevenue, subscriberCount] = await Promise.all([
      this.prisma.transactions.aggregate({
        _sum: { amount: true },
        where: {
          status: 'success',
          created_at: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
      }),

      this.prisma.transactions.aggregate({
        _sum: { amount: true },
        where: {
          status: 'success',
          created_at: {
            gte: yesterdayStart,
            lte: yesterdayEnd,
          },
        },
      }),

      this.prisma.orders.count({
        where: {
          created_at: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
      }),
    ]);

    const todayAmount =
      revenue._sum.amount instanceof Decimal
        ? revenue._sum.amount.toNumber()
        : 0;

    const yesterdayAmount =
      yesterdayRevenue._sum.amount instanceof Decimal
        ? yesterdayRevenue._sum.amount.toNumber()
        : 0;

    const growth =
      yesterdayAmount !== 0
        ? ((todayAmount - yesterdayAmount) / yesterdayAmount) * 100
        : 0;

    return {
      totalRevenue: todayAmount,
      totalSubscribers: subscriberCount,
      averageGrowth: parseFloat(growth.toFixed(1)),
    };
  }

  async getRegionWiseAnalytics(startDate: Date, endDate: Date) {
    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);
    rangeEnd.setHours(23, 59, 59);

    const diffInDays = Math.ceil(
      (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24),
    );

    const previousStart = new Date(rangeStart);
    previousStart.setDate(previousStart.getDate() - diffInDays);

    const previousEnd = new Date(rangeEnd);
    previousEnd.setDate(previousEnd.getDate() - diffInDays);

    const regions = await this.prisma.regions.findMany({
      include: {
        users: {
          include: {
            transactions: true,
            orders: true,
          },
        },
      },
    });

    return regions.map((region) => {
      const users = region.users;

      // Revenue for current range
      const currentRevenue = users.reduce((sum, user) => {
        return (
          sum +
          user.transactions
            .filter(
              (tx) =>
                tx.status === 'success' &&
                tx.created_at >= rangeStart &&
                tx.created_at <= rangeEnd,
            )
            .reduce((acc, tx) => acc + Number(tx.amount), 0)
        );
      }, 0);

      // Revenue for previous range
      const previousRevenue = users.reduce((sum, user) => {
        return (
          sum +
          user.transactions
            .filter(
              (tx) =>
                tx.status === 'success' &&
                tx.created_at >= previousStart &&
                tx.created_at <= previousEnd,
            )
            .reduce((acc, tx) => acc + Number(tx.amount), 0)
        );
      }, 0);

      const subscribers = new Set(
        users
          .flatMap((u) => u.orders)
          .filter(
            (order) =>
              order.created_at >= rangeStart && order.created_at <= rangeEnd,
          )
          .map((o) => o.id),
      ).size;

      const growth =
        previousRevenue > 0
          ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
          : 0;

      return {
        region_id: region.id,
        region: region.name,
        pincode: region.pincode,
        revenue: currentRevenue,
        subscribers,
        growth: parseFloat(growth.toFixed(1)),
      };
    });
  }

  async getRegionAnalyticsSummary(
    regionId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // 1. Get all successful orders from users in the specified region within date range
    const orders = await this.prisma.orders.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ['completed', 'active'] },
        user: {
          region_id: regionId,
        },
      },
      include: {
        user: true,
        preferences: true,
      },
    });

    // 2. Compute Metrics
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.amount), 0);
    const totalOrders = orders.length;

    const uniqueCustomerIds = new Set(orders.map((o) => o.user_id));
    const totalCustomers = uniqueCustomerIds.size;

    let breakfast = 0;
    let lunch = 0;
    let dinner = 0;
    let comboOrders = 0;

    for (const order of orders) {
      let b = 0,
        l = 0,
        d = 0;
      for (const pref of order.preferences) {
        if (pref.breakfast) b = 1;
        if (pref.lunch) l = 1;
        if (pref.dinner) d = 1;
      }

      breakfast += b;
      lunch += l;
      dinner += d;

      const totalMeals = b + l + d;
      if (totalMeals >= 2) comboOrders++;
    }

    const comboPercentage =
      totalOrders > 0 ? (comboOrders / totalOrders) * 100 : 0;

    return {
      regionId,
      totalRevenue,
      totalOrders,
      totalCustomers,
      breakfast,
      lunch,
      dinner,
      comboPercentage: +comboPercentage.toFixed(2),
    };
  }
}
