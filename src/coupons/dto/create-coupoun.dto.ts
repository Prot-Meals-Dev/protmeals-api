import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';

export class CreateCouponDto {
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsNumber()
  days_added?: number;

  @IsOptional()
  @IsNumber()
  discount_price?: number;

  @IsNotEmpty()
  @IsDateString()
  expires_at: string;
}
