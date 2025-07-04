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

@Controller('delivery-assignments')
@UseGuards(JwtAuthGuard)
export class DeliveryAssignmentsController {
  constructor(
    private readonly deliveryAssignmentsService: DeliveryAssignmentsService,
  ) {}

  @Get('my-deliveries')
  async getMyDeliveries(@Req() req: Request, @Query('date') date?: string) {
    const partnerId = req.user['userId'];
    return this.deliveryAssignmentsService.getPartnerDeliveries(
      partnerId,
      date,
    );
  }

  @Get(':id')
  async getDeliveryDetails(@Param('id') id: string, @Req() req: Request) {
    const partnerId = req.user['userId'];
    const delivery = await this.deliveryAssignmentsService.getDeliveryDetail(
      id,
      partnerId,
    );

    if (!delivery)
      throw new NotFoundException('Delivery not found or unauthorized');

    return delivery;
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto,
    @Req() req: Request,
  ) {
    const partnerId = req.user['userId'];
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
