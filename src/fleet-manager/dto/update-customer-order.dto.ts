import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
  ValidateNested,
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

export class UpdateCustomerOrderDto {
  @IsOptional() @IsString() delivery_address?: string;
  @IsOptional() @IsDateString() start_date?: string;
  @IsOptional() @IsDateString() end_date?: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => MealPreferencesDto)
  meal_preferences?: MealPreferencesDto;

  @IsOptional() @IsArray() recurring_days?: string[]; // e.g. ["mon", "wed", "fri"]
}
