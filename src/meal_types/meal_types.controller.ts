import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CreateMealTypeDto } from './dto/create-meal_type.dto';
import { UpdateMealTypeDto } from './dto/update-meal_type.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { MealTypesService } from './meal_types.service';
import { Public } from 'src/common/decorators/public.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('meal-types')
export class MealTypesController {
  constructor(
    private readonly mealTypesService: MealTypesService,
  ) {}

  @Get()
  @Public()
  async findAll(@Req() req) {
    req.responseMessage = 'Meal Types fetched successfully';
    return await this.mealTypesService.findAll();
  }

  @Get(':id')
  @Public()
  async findOne(@Req() req, @Param('id') id: string) {
    req.responseMessage = 'Meal Type fetched successfully';
    return await this.mealTypesService.findOne(id);
  }

  @Post()
  @Roles('admin')
  async create(@Req() req, @Body() createMealTypeDto: CreateMealTypeDto) {
    req.responseMessage = 'Meal Type created successfully';
    return await this.mealTypesService.create(createMealTypeDto);
  }

  @Patch(':id')
  @Roles('admin')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateMealTypeDto: UpdateMealTypeDto,
  ) {
    req.responseMessage = 'Meal Type updated successfully';
    return await this.mealTypesService.update(id, updateMealTypeDto);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Req() req, @Param('id') id: string) {
    req.responseMessage = 'Meal Type deleted successfully';
    return await this.mealTypesService.remove(id);
  }
}
