import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { WeeklyMenuService } from './weekly-menu.service';
import { CreateWeeklyMenuDto } from './dto/create-weekly-menu.dto';
import { UpdateWeeklyMenuDto } from './dto/update-weekly-menu.dto';

@Controller('weekly-menu')
export class WeeklyMenuController {
  constructor(private readonly weeklyMenuService: WeeklyMenuService) {}

  @Post()
  create(@Body() dto: CreateWeeklyMenuDto) {
    return this.weeklyMenuService.create(dto);
  }

  @Get()
  findAll() {
    return this.weeklyMenuService.findAll();
  }

  @Get('by-day')
  findByDay(@Query('day') day: string) {
    return this.weeklyMenuService.findByDay(day);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWeeklyMenuDto) {
    return this.weeklyMenuService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.weeklyMenuService.remove(id);
  }
}
