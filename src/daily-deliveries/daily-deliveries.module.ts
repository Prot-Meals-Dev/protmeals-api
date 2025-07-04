import { Module } from '@nestjs/common';
import { DailyDeliveriesService } from './daily-deliveries.service';
import { DailyDeliveriesController } from './daily-deliveries.controller';

@Module({
  controllers: [DailyDeliveriesController],
  providers: [DailyDeliveriesService],
})
export class DailyDeliveriesModule {}