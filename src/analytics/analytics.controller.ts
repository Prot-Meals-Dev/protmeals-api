import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFilterDto } from './dto/analytics-filter.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'fleet_manager')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async getSummaryStats(@Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getSummaryStats(filters);
  }

  @Get('revenue-by-meal-type')
  async getRevenueByMealType(@Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getRevenueByMealType(filters);
  }

  @Get('revenue-chart')
  async getRevenueChart(@Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getRevenueChart(filters);
  }

  @Get('meal-combination-trends')
  async getMealCombinationTrends(@Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getMealCombinationTrends(filters);
  }

  @Get('weekly-orders')
  async getWeeklyOrders(@Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getWeeklyOrders(filters);
  }
}
