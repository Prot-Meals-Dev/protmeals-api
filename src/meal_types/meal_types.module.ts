import { Module } from '@nestjs/common';
import { MealTypesService } from './meal_types.service';
import { MealTypesController } from './meal_types.controller';

@Module({
  controllers: [MealTypesController],
  providers: [MealTypesService],
})
export class MealTypesModule {}
