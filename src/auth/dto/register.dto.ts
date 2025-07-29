import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsNotEmpty()
  region_id: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  message?: string;
}
