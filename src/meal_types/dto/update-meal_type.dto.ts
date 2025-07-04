import { PartialType } from '@nestjs/mapped-types';
import { CreateMealTypeDto } from './create-meal_type.dto';

export class UpdateMealTypeDto extends PartialType(CreateMealTypeDto) {}
