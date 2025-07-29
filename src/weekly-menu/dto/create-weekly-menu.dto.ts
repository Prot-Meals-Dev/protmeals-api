import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWeeklyMenuDto {
  @IsString()
  @IsNotEmpty()
  day: string;

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
