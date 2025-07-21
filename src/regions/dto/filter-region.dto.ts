import {
  IsOptional,
  IsString,
  IsBooleanString,
  IsNumberString,
} from 'class-validator';

export class FilterRegionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsBooleanString()
  is_serviceable?: string; // use string because query params are strings

  @IsOptional()
  @IsNumberString()
  delivery_count?: string;

  @IsOptional()
  @IsNumberString()
  customer_count?: string;
}
