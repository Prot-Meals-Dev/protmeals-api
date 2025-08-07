import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AnalyticsFilterDto, TimePeriod } from './dto/analytics-filter.dto';
import { order_status_enum } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummaryStats(filters: AnalyticsFilterDto) {
    const { startDate, endDate, regionId } = filters;

    // Build where clause for filtering
    const whereClause: any = {
      status: {
        in: [order_status_enum.active, order_status_enum.completed],
      },
    };

    if (startDate) {
      whereClause.created_at = {
        ...whereClause.created_at,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      whereClause.created_at = {
        ...whereClause.created_at,
        lte: new Date(endDate),
      };
    }

    if (regionId) {
      whereClause.user = {
        region_id: regionId,
      };
    }

    // Get summary statistics
    const [totalRevenue, totalOrders, totalCustomers] = await Promise.all([
      // Total Revenue
      this.prisma.orders.aggregate({
        where: whereClause,
        _sum: {
          amount: true,
        },
      }),

      // Total Orders
      this.prisma.orders.count({
        where: whereClause,
      }),

      // Total Unique Customers
      this.prisma.orders.findMany({
        where: whereClause,
        select: {
          user_id: true,
        },
        distinct: ['user_id'],
      }),
    ]);

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      totalOrders,
      totalCustomers: totalCustomers.length,
      period: `${startDate || 'All time'} to ${endDate || 'Present'}`,
    };
  }

  async getRevenueByMealType(filters: AnalyticsFilterDto) {
    const { startDate, endDate, regionId } = filters;

    const whereClause: any = {
      status: {
        in: [order_status_enum.active, order_status_enum.completed],
      },
    };

    if (startDate) {
      whereClause.created_at = {
        ...whereClause.created_at,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      whereClause.created_at = {
        ...whereClause.created_at,
        lte: new Date(endDate),
      };
    }

    if (regionId) {
      whereClause.user = {
        region_id: regionId,
      };
    }

    // Get orders with meal preferences
    const orders = await this.prisma.orders.findMany({
      where: whereClause,
      include: {
        preferences: true,
        meal_type: true,
      },
    });

    let breakfastRevenue = 0;
    let lunchRevenue = 0;
    let dinnerRevenue = 0;
    let comboOrders = 0;

    orders.forEach((order) => {
      const mealType = order.meal_type;
      if (!mealType) return;

      const preferences = order.preferences;
      const hasBreakfast = preferences.some((p) => p.breakfast);
      const hasLunch = preferences.some((p) => p.lunch);
      const hasDinner = preferences.some((p) => p.dinner);

      const mealCount = [hasBreakfast, hasLunch, hasDinner].filter(
        Boolean,
      ).length;

      if (mealCount > 1) {
        comboOrders++;
      }

      // Calculate revenue per meal type
      const orderAmount = Number(order.amount);
      const perMealAmount = orderAmount / mealCount;

      if (hasBreakfast) breakfastRevenue += perMealAmount;
      if (hasLunch) lunchRevenue += perMealAmount;
      if (hasDinner) dinnerRevenue += perMealAmount;
    });

    return {
      breakfast: Math.round(breakfastRevenue),
      lunch: Math.round(lunchRevenue),
      dinner: Math.round(dinnerRevenue),
      comboOrders,
      comboPercentage:
        orders.length > 0 ? Math.round((comboOrders / orders.length) * 100) : 0,
    };
  }

  async getRevenueChart(filters: AnalyticsFilterDto) {
    const {
      startDate,
      endDate,
      regionId,
      period = TimePeriod.WEEKLY,
    } = filters;

    // Set default date range if not provided
    const endDateObj = endDate ? new Date(endDate) : new Date();
    const startDateObj = startDate
      ? new Date(startDate)
      : new Date(endDateObj.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const whereClause: any = {
      status: {
        in: [order_status_enum.active, order_status_enum.completed],
      },
      created_at: {
        gte: startDateObj,
        lte: endDateObj,
      },
    };

    if (regionId) {
      whereClause.user = {
        region_id: regionId,
      };
    }

    const orders = await this.prisma.orders.findMany({
      where: whereClause,
      include: {
        preferences: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    // Group orders by time period
    const chartData: any[] = [];
    const groupedData = new Map();

    orders.forEach((order) => {
      const date = new Date(order.created_at);
      let key: string;

      switch (period) {
        case TimePeriod.DAILY:
          key = date.toISOString().split('T')[0];
          break;
        case TimePeriod.WEEKLY:
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case TimePeriod.MONTHLY:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          period: key,
          breakfast: 0,
          lunch: 0,
          dinner: 0,
          total: 0,
        });
      }

      const group = groupedData.get(key);
      const preferences = order.preferences;
      const hasBreakfast = preferences.some((p) => p.breakfast);
      const hasLunch = preferences.some((p) => p.lunch);
      const hasDinner = preferences.some((p) => p.dinner);

      const mealCount = [hasBreakfast, hasLunch, hasDinner].filter(
        Boolean,
      ).length;
      const orderAmount = Number(order.amount);
      const perMealAmount = orderAmount / mealCount;

      if (hasBreakfast) group.breakfast += perMealAmount;
      if (hasLunch) group.lunch += perMealAmount;
      if (hasDinner) group.dinner += perMealAmount;
      group.total += orderAmount;
    });

    // Convert to array and sort
    return Array.from(groupedData.values()).map((item) => ({
      ...item,
      breakfast: Math.round(item.breakfast),
      lunch: Math.round(item.lunch),
      dinner: Math.round(item.dinner),
      total: Math.round(item.total),
    }));
  }

  async getMealCombinationTrends(filters: AnalyticsFilterDto) {
    const { startDate, endDate, regionId } = filters;

    const whereClause: any = {
      status: {
        in: [order_status_enum.active, order_status_enum.completed],
      },
    };

    if (startDate) {
      whereClause.created_at = {
        ...whereClause.created_at,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      whereClause.created_at = {
        ...whereClause.created_at,
        lte: new Date(endDate),
      };
    }

    if (regionId) {
      whereClause.user = {
        region_id: regionId,
      };
    }

    const orders = await this.prisma.orders.findMany({
      where: whereClause,
      include: {
        preferences: true,
      },
    });

    const combinations = {
      'Breakfast Only': 0,
      'Lunch Only': 0,
      'Dinner Only': 0,
      'Breakfast + Lunch': 0,
      'Breakfast + Dinner': 0,
      'Lunch + Dinner': 0,
      'All Meals': 0,
    };

    orders.forEach((order) => {
      const preferences = order.preferences;
      const hasBreakfast = preferences.some((p) => p.breakfast);
      const hasLunch = preferences.some((p) => p.lunch);
      const hasDinner = preferences.some((p) => p.dinner);

      if (hasBreakfast && hasLunch && hasDinner) {
        combinations['All Meals']++;
      } else if (hasBreakfast && hasLunch) {
        combinations['Breakfast + Lunch']++;
      } else if (hasBreakfast && hasDinner) {
        combinations['Breakfast + Dinner']++;
      } else if (hasLunch && hasDinner) {
        combinations['Lunch + Dinner']++;
      } else if (hasBreakfast) {
        combinations['Breakfast Only']++;
      } else if (hasLunch) {
        combinations['Lunch Only']++;
      } else if (hasDinner) {
        combinations['Dinner Only']++;
      }
    });

    const totalOrders = orders.length;

    return Object.entries(combinations).map(([name, count]) => ({
      name,
      value: count,
      percentage: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
    }));
  }

  async getWeeklyOrders(filters: AnalyticsFilterDto) {
    const { startDate, endDate, regionId } = filters;

    const whereClause: any = {
      status: {
        in: [order_status_enum.active, order_status_enum.completed],
      },
    };

    if (startDate) {
      whereClause.created_at = {
        ...whereClause.created_at,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      whereClause.created_at = {
        ...whereClause.created_at,
        lte: new Date(endDate),
      };
    }

    if (regionId) {
      whereClause.user = {
        region_id: regionId,
      };
    }

    const orders = await this.prisma.orders.findMany({
      where: whereClause,
      select: {
        created_at: true,
      },
    });

    const weeklyData = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
      Sun: 0,
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    orders.forEach((order) => {
      const dayOfWeek = new Date(order.created_at).getDay();
      const dayName = dayNames[dayOfWeek];
      weeklyData[dayName]++;
    });

    const maxOrders = Math.max(...Object.values(weeklyData));

    return Object.entries(weeklyData).map(([day, count]) => ({
      day,
      orders: count,
      percentage: maxOrders > 0 ? Math.round((count / maxOrders) * 100) : 0,
    }));
  }
}
