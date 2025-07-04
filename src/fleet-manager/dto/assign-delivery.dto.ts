import { IsEnum, IsNotEmpty, IsString, IsInt } from 'class-validator';
import { meal_type_enum } from '@prisma/client';

export class AssignDeliveryDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  mealTypeId: string;

  @IsEnum(meal_type_enum)
  mealType: meal_type_enum;

  @IsString()
  @IsNotEmpty()
  partnerId: string;

  @IsString()
  assignedBy: string;

  @IsInt()
  sequence: number;
}
