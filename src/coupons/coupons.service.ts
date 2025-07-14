import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async generateCouponForOrder(orderId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        daily_deliveries: true,
        user: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const existingCoupon = await this.prisma.coupons.findFirst({
      where: {
        orders: {
          some: {
            id: orderId,
          },
        },
      },
    });

    if (existingCoupon) {
      throw new BadRequestException('Coupon already exists for this order');
    }

    const { start_date, end_date, daily_deliveries, user_id } = order;

    const totalDays = Math.ceil(
      (end_date.getTime() - start_date.getTime()) / (1000 * 60 * 60 * 24)
    );

    const expectedDeliveries = totalDays;
    const completedDeliveries = daily_deliveries.filter(
      (d) => d.status === 'delivered'
    ).length;

    const missedDeliveries = expectedDeliveries - completedDeliveries;

    if (missedDeliveries <= 0) {
      throw new BadRequestException('No missed deliveries found');
    }

    const discountPrice = new Prisma.Decimal(missedDeliveries * 20);

    const coupon = await this.prisma.coupons.create({
      data: {
        text: `MISSED-${missedDeliveries}-${Date.now()}`,
        days_added: missedDeliveries,
        discount_price: discountPrice,
        created_by: user_id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        orders: {
          connect: {
            id: orderId,
          },
        },
      },
    });

    return coupon;
  }
}