import { IsEnum, IsOptional, IsString } from 'class-validator';
import { user_status_enum } from '@prisma/client';

export class ChangeUserStatusDto {
  @IsEnum(user_status_enum)
  status: user_status_enum;

  @IsOptional()
  @IsString()
  reason?: string; // Optional reason for status change
}
