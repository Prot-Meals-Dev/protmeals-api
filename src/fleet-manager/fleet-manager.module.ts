import { Module } from '@nestjs/common';
import { FleetManagerService } from './fleet-manager.service';
import { FleetManagerController } from './fleet-manager.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseModule } from 'src/response/response.module';

@Module({
  imports: [ResponseModule],
  controllers: [FleetManagerController],
  providers: [FleetManagerService, PrismaService],
})
export class FleetManagerModule {}
