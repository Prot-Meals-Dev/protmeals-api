import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import Razorpay = require('razorpay');
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay;

  constructor(private prisma: PrismaService) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });
  }

  async createRazorpayOrder(
    amountInRupees: number,
    receipt: string,
    notes?: any,
  ) {
    const amountInPaise = Math.round(amountInRupees * 100);
    const currency = process.env.RAZORPAY_CURRENCY || 'INR';

    const rpOrder = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes,
    });

    return rpOrder; // contains id, amount, currency, status, receipt, etc.
  }

  verifyRazorpaySignature(
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
  ) {
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new UnauthorizedException('Invalid payment signature');
    }

    return true;
  }

  verifyWebhookSignature(rawBody: Buffer, headerSignature: string) {
    const secret =
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      process.env.RAZORPAY_KEY_SECRET ||
      '';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    return expected === headerSignature;
  }
}
