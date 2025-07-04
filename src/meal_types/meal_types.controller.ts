import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CreateMealTypeDto } from './dto/create-meal_type.dto';
import { UpdateMealTypeDto } from './dto/update-meal_type.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { MealTypesService } from './meal_types.service';
import { ResponseService } from 'src/response/response.service';
import { Public } from 'src/common/decorators/public.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('meal-types')
export class MealTypesController {
  constructor(
    private readonly mealTypesService: MealTypesService,
    private readonly responseService: ResponseService,
  ) {}

  @Post()
  async create(@Body() createMealTypeDto: CreateMealTypeDto) {
    const mealType = await this.mealTypesService.create(createMealTypeDto);
    return this.responseService.successResponse(
      'Meal Type created successfully',
      mealType,
    );
  }

  @Get()
  @Public()
  async findAll() {
    const mealTypes = await this.mealTypesService.findAll();
    return this.responseService.successResponse(
      'Meal Types fetched successfully',
      mealTypes,
    );
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    const mealType = await this.mealTypesService.findOne(id);
    return this.responseService.successResponse(
      'Meal Type fetched successfully',
      mealType,
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateMealTypeDto: UpdateMealTypeDto,
  ) {
    const updated = await this.mealTypesService.update(id, updateMealTypeDto);
    return this.responseService.successResponse(
      'Meal Type updated successfully',
      updated,
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.mealTypesService.remove(id);
    return this.responseService.successResponse(
      'Meal Type deleted successfully',
      deleted,
    );
  }
}
