import { Module } from '@nestjs/common';
import { FleetManagerService } from './fleet-manager.service';
import { FleetManagerController } from './fleet-manager.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrdersModule } from 'src/orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [FleetManagerController],
  providers: [FleetManagerService, PrismaService],
})
export class FleetManagerModule {}
