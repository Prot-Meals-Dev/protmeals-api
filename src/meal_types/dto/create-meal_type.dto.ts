import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateMealTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description?: string;

  @IsNumber()
  breakfast_price: number;

  @IsNumber()
  lunch_price: number;

  @IsNumber()
  dinner_price: number;
}
