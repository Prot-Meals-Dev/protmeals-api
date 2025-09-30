import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsArray,
  IsUUID,
  IsEnum,
  IsDateString,
  IsOptional,
  isNotEmpty,
} from 'class-validator';
import { meal_type_enum } from '@prisma/client';

export class MealPreferencesDto {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export class CreateCustomerOrderDto {
  // Customer Info
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  delivery_address: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  // Order Info
  @IsUUID()
  meal_type_id: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsArray()
  recurring_days: string[]; // e.g., ['mon', 'wed', 'fri']

  @IsNotEmpty()
  meal_preferences: MealPreferencesDto;

  @IsUUID()
  delivery_partner_id: string;

  // Optional remarks field
  @IsOptional()
  @IsString()
  remarks?: string;
}
