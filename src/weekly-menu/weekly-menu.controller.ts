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
  Req,
} from '@nestjs/common';
import { WeeklyMenuService } from './weekly-menu.service';
import { CreateWeeklyMenuDto } from './dto/create-weekly-menu.dto';
import { UpdateWeeklyMenuDto } from './dto/update-weekly-menu.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Request } from 'express';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('weekly-menu')
@UseGuards(JwtAuthGuard)
export class WeeklyMenuController {
  constructor(private readonly weeklyMenuService: WeeklyMenuService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateWeeklyMenuDto) {
    return this.weeklyMenuService.create(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'fleet_manager')
  findAll() {
    return this.weeklyMenuService.findAll();
  }

  @Get('customer/my-region')
  async getMenuForCustomerRegion(@Req() req: Request) {
    const customerId = req.user['id'];
    return this.weeklyMenuService.findByCustomerRegion(customerId);
  }

  @Get('by-region/:regionId')
  @Public()
  findByRegion(@Param('regionId') regionId: string) {
    return this.weeklyMenuService.findByRegion(regionId);
  }

  @Get('by-day')
  findByDay(@Query('day') day: string) {
    return this.weeklyMenuService.findByDay(day);
  }

  @Get('by-day-region')
  findByDayAndRegion(
    @Query('day') day: string,
    @Query('regionId') regionId: string,
  ) {
    return this.weeklyMenuService.findByDayAndRegion(day, regionId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'fleet_manager')
  update(@Param('id') id: string, @Body() dto: UpdateWeeklyMenuDto) {
    return this.weeklyMenuService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.weeklyMenuService.remove(id);
  }
}
