import { IsBoolean, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateRegionDto {
  @IsString()
  name: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsString()
  pincode: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsBoolean()
  is_serviceable?: boolean;

  @IsOptional()
  @IsInt()
  delivery_count?: number;

  @IsOptional()
  @IsInt()
  customer_count?: number;

  @IsOptional()
  @IsString()
  fleetManagerId?: string;
}
