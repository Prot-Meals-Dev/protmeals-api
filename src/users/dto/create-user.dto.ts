import { user_status_enum } from '@prisma/client';
import { IsEmail, IsString, IsOptional, IsEnum, IsInt } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsString()
  role: string;

  @IsEnum(user_status_enum)
  @IsOptional()
  status?: user_status_enum = user_status_enum.active;

  @IsOptional()
  stripe_customer_id?: string;
}
