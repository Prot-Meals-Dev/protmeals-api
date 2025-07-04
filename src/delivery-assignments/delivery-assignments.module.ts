import { Module } from '@nestjs/common';
import { DeliveryAssignmentsService } from './delivery-assignments.service';
import { DeliveryAssignmentsController } from './delivery-assignments.controller';
import { DeliveryCronService } from './delivery-cron.service';

@Module({
  controllers: [DeliveryAssignmentsController],
  providers: [DeliveryCronService, DeliveryAssignmentsService],
})
export class DeliveryAssignmentsModule {}
