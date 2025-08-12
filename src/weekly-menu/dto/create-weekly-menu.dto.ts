import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateWeeklyMenuDto {
  @IsString()
  @IsNotEmpty()
  day: string;

  @IsUUID()
  @IsNotEmpty()
  region_id: string;

  @IsOptional()
  @IsString()
  breakfast?: string;

  @IsOptional()
  @IsString()
  lunch?: string;

  @IsOptional()
  @IsString()
  dinner?: string;
}
