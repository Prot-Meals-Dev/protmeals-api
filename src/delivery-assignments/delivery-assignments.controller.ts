import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryAssignmentsService } from './delivery-assignments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';
import { UpdateDeliveryStatusDto } from './dto/update-status.dto';
import { delivery_item_status_enum, meal_type_enum } from '@prisma/client';

@Controller('delivery-assignments')
@UseGuards(JwtAuthGuard)
export class DeliveryAssignmentsController {
  constructor(
    private readonly deliveryAssignmentsService: DeliveryAssignmentsService,
  ) {}
  
  @Get('my-deliveries')
  async getMyDeliveries(
    @Req() req: Request,
    @Query('date') date?: string,
    @Query('status') status?: delivery_item_status_enum,
    @Query('mealType') mealType?: meal_type_enum,
  ) {
    const partnerId = req.user['id'];
    return this.deliveryAssignmentsService.getPartnerDeliveries(
      partnerId,
      date,
      status,
      mealType,
    );
  }

  @Get('analytics')
  async getAnalytics(@Req() req: Request) {
    const partnerId = req.user['id'];
    const analytics =
      await this.deliveryAssignmentsService.getDeliveryPartnerAnalytics(
        partnerId,
      );
    req['responseMessage'] = 'Delivery partner analytics fetched successfully';
    return analytics;
  }

  @Get(':id')
  async getDeliveryDetails(@Param('id') id: string, @Req() req: Request) {
    const partnerId = req.user['id'];
    const delivery = await this.deliveryAssignmentsService.getDeliveryDetail(
      id,
      partnerId,
    );

    if (!delivery)
      throw new NotFoundException('Delivery not found or unauthorized');

    return delivery;
  }

  @Get('partner/orders')
  @UseGuards(JwtAuthGuard)
  async getPartnerOrders(@Req() req) {
    const partnerId = req.user.id;
    const orders =
      await this.deliveryAssignmentsService.getAssignedOrdersForPartner(
        partnerId,
      );
    return orders;
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto,
    @Req() req: Request,
  ) {
    const partnerId = req.user['id'];
    const updated = await this.deliveryAssignmentsService.updateDeliveryStatus(
      id,
      dto.status,
      partnerId,
    );

    if (!updated)
      throw new NotFoundException('Delivery not found or unauthorized');
    return { success: true, message: 'Status updated successfully' };
  }
}
