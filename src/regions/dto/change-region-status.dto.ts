import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ChangeRegionStatusDto {
  @IsBoolean()
  is_serviceable: boolean;

  @IsOptional()
  @IsString()
  reason?: string; // Optional reason for status change
}
