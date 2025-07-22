import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupoun.dto';

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService) {}

  async createCoupon(dto: CreateCouponDto, created_by: string) {
    return this.prisma.coupons.create({
      data: {
        text: dto.text,
        days_added: dto.days_added,
        discount_price: dto.discount_price,
        created_by: created_by,
        expires_at: new Date(dto.expires_at),
      },
    });
  }

  async getAllCoupons() {
    return this.prisma.coupons.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async getCouponByCode(code: string) {
    return this.prisma.coupons.findFirst({
      where: { text: code },
    });
  }

  async deleteCoupon(id: string) {
    return this.prisma.coupons.delete({
      where: { id },
    });
  }
}
