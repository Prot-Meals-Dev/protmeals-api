import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { CouponService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupoun.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Request } from 'express';
import dayjs from 'dayjs';

@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponController {
  constructor(private couponService: CouponService) {}

  @UseGuards(RolesGuard)
  @Roles('admin', 'fleet_manager')
  @Post()
  create(@Body() dto: CreateCouponDto, @Req() req: Request) {
    const user_id = req.user['id'];
    return this.couponService.createCoupon(dto, user_id);
  }

  @Get()
  findAll() {
    return this.couponService.getAllCoupons();
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.couponService.getCouponByCode(code);
  }

  @Get('validate/:code')
  async validate(@Param('code') code: string) {
    const coupon = await this.couponService.getCouponByCode(code);

    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    if (coupon.status !== 'active') {
      throw new BadRequestException('Coupon is not active');
    }

    if (dayjs(coupon.expires_at).isBefore(dayjs())) {
      throw new BadRequestException('Coupon has expired');
    }

    return {
      valid: true,
      code: coupon.text,
      discountPrice: coupon.discount_price ? Number(coupon.discount_price) : 0,
      daysAdded: coupon.days_added || 0,
      expiresAt: coupon.expires_at,
    };
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.couponService.deleteCoupon(id);
  }
}
