import { IsOptional, IsString } from 'class-validator';

export class DeleteOrderDto {
  @IsOptional()
  @IsString()
  reason?: string; // Optional reason for deletion
}
