import { IsOptional, IsString } from 'class-validator';

export class UpdateCustomerOrderDto {
  @IsOptional()
  @IsString()
  delivery_address?: string; // for order

  @IsOptional()
  @IsString()
  phone?: string; // user's phone

  @IsOptional()
  @IsString()
  address?: string; // ✅ user's address

  @IsOptional()
  @IsString()
  delivery_partner_id?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
