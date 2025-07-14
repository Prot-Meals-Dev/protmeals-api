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

  @IsString()
  role: string;

  @IsString()
  @IsOptional()
  address: string;

  @IsEnum(user_status_enum)
  @IsOptional()
  status?: user_status_enum = user_status_enum.active;
}
