import { Module } from '@nestjs/common';
import { MealTypesService } from './meal_types.service';
import { MealTypesController } from './meal_types.controller';
import { ResponseModule } from 'src/response/response.module';

@Module({
  imports: [ResponseModule],
  controllers: [MealTypesController],
  providers: [MealTypesService],
})
export class MealTypesModule {}
