import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMealTypeDto } from './dto/create-meal_type.dto';
import { UpdateMealTypeDto } from './dto/update-meal_type.dto';

@Injectable()
export class MealTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMealTypeDto: CreateMealTypeDto) {
    return this.prisma.meal_types.create({
      data: createMealTypeDto,
    });
  }

  async findAll() {
    return this.prisma.meal_types.findMany();
  }

  async findOne(id: string) {
    const mealType = await this.prisma.meal_types.findUnique({
      where: { id },
    });
    if (!mealType) throw new NotFoundException('Meal type not found');
    return mealType;
  }

  async update(id: string, updateMealTypeDto: UpdateMealTypeDto) {
    await this.findOne(id); // ensure it exists
    return this.prisma.meal_types.update({
      where: { id },
      data: updateMealTypeDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // ensure it exists
    return this.prisma.meal_types.delete({
      where: { id },
    });
  }
}
