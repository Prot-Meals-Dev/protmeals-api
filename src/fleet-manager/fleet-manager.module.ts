import { Module } from '@nestjs/common';
import { FleetManagerService } from './fleet-manager.service';
import { FleetManagerController } from './fleet-manager.controller';
import { OrdersModule } from 'src/orders/orders.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [OrdersModule, PrismaModule],
  controllers: [FleetManagerController],
  providers: [FleetManagerService],
})
export class FleetManagerModule {}
