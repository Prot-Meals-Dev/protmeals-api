import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

class MealPreferencesDto {
  @IsBoolean()
  breakfast: boolean;

  @IsBoolean()
  lunch: boolean;

  @IsBoolean()
  dinner: boolean;
}

export class CreateOrderDto {
  @IsUUID()
  customer_id: string;

  @IsString()
  @IsNotEmpty()
  contact_number: string;

  @IsString()
  @IsNotEmpty()
  customer_address: string;

  @IsString()
  @IsNotEmpty()
  delivery_address: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsUUID()
  meal_type_id: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  recurring_days: number[]; // 0 = Sun, 1 = Mon, etc.

  @ValidateNested()
  @Type(() => MealPreferencesDto)
  meal_preferences: MealPreferencesDto;

  @IsUUID()
  delivery_partner_id: string;

  @IsUUID()
  assigned_by: string;
}

export class  CustomerCreateOrderDto {
  @IsString()
  @IsNotEmpty()
  contact_number: string;

  @IsString()
  @IsNotEmpty()
  delivery_address: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsUUID()
  meal_type_id: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  recurring_days: number[]; // 0 = Sun, 1 = Mon, etc.

  @ValidateNested()
  @Type(() => MealPreferencesDto)
  meal_preferences: MealPreferencesDto;
}
