import { IsEnum } from 'class-validator';

export enum DeliveryItemStatus {
  pending = 'pending',
  skipped = 'skipped',
  delivered = 'delivered',
  cancelled = 'cancelled',
  generated = 'generated',
}

export class UpdateDeliveryStatusDto {
  @IsEnum(DeliveryItemStatus)
  status: DeliveryItemStatus;
}
