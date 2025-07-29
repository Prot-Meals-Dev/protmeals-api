import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('summary')
  getSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminService.getSummaryAnalytics(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('regions')
  getRegionData(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminService.getRegionWiseAnalytics(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('region/summary')
  getRegionAnalyticsSummary(
    @Query('regionId') regionId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminService.getRegionAnalyticsSummary(
      regionId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
