import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { VerifyRazorpayDto } from './dto/verify-razorpay.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  // This endpoint verifies the payment and activates the order
  @Post('razorpay/verify')
  async verifyRazorpay(@Body() dto: VerifyRazorpayDto, @Req() req: any) {
    const userId = req.user.id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      transactionId,
    } = dto;

    // Verify signature
    this.paymentsService.verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );

    // Find transaction by provider_order_id or id
    const txn = await this.prisma.transactions.findFirst({
      where: transactionId
        ? { id: transactionId, user_id: userId }
        : { order: { order_id: razorpay_order_id }, user_id: userId },
      include: { order: { include: { user: true } } },
    });

    if (!txn || !txn.order) {
      throw new Error('Transaction or order not found');
    }

    // Update transaction and order
    await this.prisma.$transaction([
      this.prisma.transactions.update({
        where: { id: txn.id },
        data: {
          status: 'success',
        },
      }),
      this.prisma.orders.update({
        where: { id: txn.order_id! },
        data: { payment_status: 'paid', status: 'active' },
      }),
    ]);

    // Update region stats
    const regionId = txn.order.user.region_id;
    if (regionId) {
      await this.updateRegionCounts(regionId);
    }

    return {
      message: 'Payment verified and order activated',
      order_id: txn.order.order_id,
    };
  }

  // Razorpay webhook (server-to-server). Do NOT guard this route.

  // Razorpay webhook (server-to-server). Do NOT guard this route.
  @Post('webhooks/razorpay')
  async handleRazorpayWebhook(@Req() req: any) {
    // raw body is set by express.json verify in main.ts
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const rawBody = req.rawBody as Buffer | undefined;

    if (!signature || !rawBody) {
      return { received: true };
    }

    const ok = this.paymentsService.verifyWebhookSignature(rawBody, signature);
    if (!ok) return { received: true };

    const event = req.body as any;
    const eventType: string = event.event;

    const activateOrderByInternalOrderId = async (internalOrderId: string) => {
      const txn = await this.prisma.transactions.findFirst({
        where: { order_id: internalOrderId, status: 'pending' },
        include: { order: { include: { user: true } } },
      });
      if (!txn?.order) return;

      await this.prisma.$transaction([
        this.prisma.transactions.update({
          where: { id: txn.id },
          data: { status: 'success' },
        }),
        this.prisma.orders.update({
          where: { id: txn.order_id! },
          data: { payment_status: 'paid' as any, status: 'active' },
        }),
      ]);

      const regionId = txn.order.user.region_id;
      if (regionId) await this.updateRegionCounts(regionId);
    };

    if (eventType === 'order.paid') {
      const rpOrder = event.payload?.order?.entity;
      const receipt: string | undefined = rpOrder?.receipt;
      if (receipt?.startsWith('rcpt_')) {
        const internalOrderId = receipt.substring(5);
        await activateOrderByInternalOrderId(internalOrderId);
      }
    }

    if (eventType === 'payment.captured') {
      const rpPayment = event.payload?.payment?.entity;
      const rpOrderId: string | undefined = rpPayment?.order_id;
      if (rpOrderId) {
        const txn = await this.prisma.transactions.findFirst({
          where: { provider_order_id: rpOrderId } as any,
          include: { order: { include: { user: true } } },
        });
        if (txn?.order?.id) await activateOrderByInternalOrderId(txn.order.id);
      }
    }

    if (
      eventType === 'payment.failed' ||
      eventType === 'order.payment_failed'
    ) {
      const rpOrder = event.payload?.order?.entity;
      const receipt: string | undefined = rpOrder?.receipt;
      if (receipt?.startsWith('rcpt_')) {
        const internalOrderId = receipt.substring(5);
        const txn = await this.prisma.transactions.findFirst({
          where: { order_id: internalOrderId, status: 'pending' },
        });
        if (txn) {
          await this.prisma.transactions.update({
            where: { id: txn.id },
            data: { status: 'failed' },
          });
          await this.prisma.orders.update({
            where: { id: internalOrderId },
            data: { payment_status: 'failed' },
          });
        }
      }
    }

    return { received: true };
  }

  private async updateRegionCounts(regionId: string) {
    const [customerCount, orderCount] = await Promise.all([
      this.prisma.users.count({ where: { region_id: regionId } }),
      this.prisma.orders.count({ where: { user: { region_id: regionId } } }),
    ]);

    await this.prisma.regions.update({
      where: { id: regionId },
      data: {
        customer_count: customerCount,
        delivery_count: orderCount,
      },
    });
  }
}
