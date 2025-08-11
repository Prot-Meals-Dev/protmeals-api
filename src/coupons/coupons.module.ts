import { Module } from '@nestjs/common';
import { CouponController } from './coupons.controller';
import { CouponService } from './coupons.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CouponController],
  providers: [CouponService],
})
export class CouponsModule {}
