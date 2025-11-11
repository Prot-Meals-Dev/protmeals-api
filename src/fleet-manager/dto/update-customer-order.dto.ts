import { IsOptional, IsString, IsArray, IsDateString, IsNumber } from 'class-validator';
import { MealPreferencesDto } from './create-customer-order.dto';

export class UpdateCustomerOrderDto {
  @IsOptional()
  @IsString()
  delivery_address?: string; // for order

  @IsOptional()
  @IsString()
  phone?: string; // user's phone

  @IsOptional()
  @IsString()
  address?: string; // ✅ user's address

  @IsOptional()
  @IsString()
  delivery_partner_id?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  // New updatable fields
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  meal_preferences?: MealPreferencesDto;

  @IsOptional()
  @IsArray()
  recurring_days?: string[]; // e.g., ['mon', 'wed']

  @IsOptional()
  @IsNumber()
  amount?: number; // override amount if provided

  @IsOptional()
  @IsString()
  location_url?: string;
}
