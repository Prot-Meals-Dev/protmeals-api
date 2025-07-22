import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CouponService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupoun.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Request } from 'express';

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

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.couponService.deleteCoupon(id);
  }
}
