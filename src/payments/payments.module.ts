import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegionsService } from 'src/regions/regions.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService, RegionsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

