import { IsOptional, IsString, IsEmail } from 'class-validator';

export class UpdatePartnerDetailsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  status?: 'active' | 'disabled'; // optional status update
}
