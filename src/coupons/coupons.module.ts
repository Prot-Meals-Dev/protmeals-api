import { Module } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { CouponController } from './coupons.controller';
import { CouponService } from './coupons.service';

@Module({
  controllers: [CouponController],
  providers: [CouponService, PrismaService],
})
export class CouponsModule {}
