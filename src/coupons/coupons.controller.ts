import { Controller, Post, Param } from '@nestjs/common';
import { CouponsService } from './coupons.service';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('generate/:orderId')
  async generateCoupon(@Param('orderId') orderId: string) {
    const coupon = await this.couponsService.generateCouponForOrder(orderId);
    return {
      message: 'Coupon generated successfully',
      coupon,
    };
  }
}