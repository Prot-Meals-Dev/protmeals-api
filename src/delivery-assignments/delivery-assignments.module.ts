import { Module } from '@nestjs/common';
import { DeliveryAssignmentsService } from './delivery-assignments.service';
import { DeliveryAssignmentsController } from './delivery-assignments.controller';
import {
  DeliveryController,
  DeliveryCronService,
} from './delivery-cron.service';
import { OrdersModule } from 'src/orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [DeliveryAssignmentsController, DeliveryController],
  providers: [DeliveryCronService, DeliveryAssignmentsService],
})
export class DeliveryAssignmentsModule {}
