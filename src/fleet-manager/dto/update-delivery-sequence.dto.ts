import { IsArray, IsUUID, IsNumber } from 'class-validator';

export class UpdateSequenceItemDto {
  @IsUUID()
  order_id: string;

  @IsNumber()
  new_sequence: number;
}

export class UpdateDeliverySequenceDto {
  @IsArray()
  orders: UpdateSequenceItemDto[];
}
