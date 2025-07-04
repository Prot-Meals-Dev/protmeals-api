import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FleetManagerService } from './fleet-manager.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateCustomerOrderDto } from './dto/create-customer-order.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('fleet_manager')
@Controller('fleet-manager')
export class FleetManagerController {
  constructor(private readonly fleetManagerService: FleetManagerService) {}

  @Post('create-partner')
  async createPartner(@Body() dto: CreatePartnerDto, @Request() req) {
    const fleetManagerId = req.user.id;
    const deliveryPartner =
      await this.fleetManagerService.createDeliveryPartner(dto, fleetManagerId);
    req.responseMessage = 'Delivery partner created successfully';
    return deliveryPartner;
  }

  @Get('orders')
  async getRegionOrders(@Request() req) {
    const userId = req.user.id;
    const orderList = await this.fleetManagerService.getOrdersByRegion(userId);
    req.responseMessage = 'Order list fetched successfully';
    return orderList;
  }

  @Post('assign-delivery')
  async assignDelivery(@Body() dto: AssignDeliveryDto, @Request() req) {
    const result = await this.fleetManagerService.assignDelivery(dto);
    req.responseMessage = 'Delivery partner assigned successfully';
    return result;
  }

  @Post('create-customer-order')
  async createCustomerOrder(
    @Body() dto: CreateCustomerOrderDto,
    @Request() req,
  ) {
    const result = await this.fleetManagerService.createCustomerOrder(
      dto,
      req.user.id,
    );
    req.responseMessage = 'Customer order created successfully';
    return result;
  }
}
