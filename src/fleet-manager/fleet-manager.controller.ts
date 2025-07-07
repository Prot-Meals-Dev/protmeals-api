import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { FleetManagerService } from './fleet-manager.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateCustomerOrderDto } from './dto/create-customer-order.dto';
import { UpdateDeliverySequenceDto } from './dto/update-delivery-sequence.dto';
import { Request } from 'express';
import { UpdateCustomerOrderDto } from './dto/update-customer-order.dto';
import { UpdatePartnerDetailsDto } from './dto/update-partner-details.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('fleet_manager')
@Controller('fleet-manager')
export class FleetManagerController {
  constructor(private readonly fleetManagerService: FleetManagerService) {}

  @Post('create-partner')
  async createPartner(@Body() dto: CreatePartnerDto, @Req() req: Request) {
    const fleetManagerId = req.user['id'];
    const deliveryPartner =
      await this.fleetManagerService.createDeliveryPartner(dto, fleetManagerId);
    req['responseMessage'] = 'Delivery partner created successfully';
    return deliveryPartner;
  }

  @Get('orders')
  async getRegionOrders(
    @Req() req: Request,
    @Query('deliveryPartnerId') deliveryPartnerId?: string,
  ) {
    const userId = req.user['id'];
    const orderList = await this.fleetManagerService.getOrdersByRegion(
      userId,
      deliveryPartnerId,
    );
    req['responseMessage'] = 'Order list fetched successfully';
    return orderList;
  }

  @Get('analytics')
  async getFleetManagerAnalytics(@Req() req: Request) {
    const managerId = req.user['id'];
    const analytics =
      await this.fleetManagerService.getFleetManagerAnalytics(managerId);
    req['responseMessage'] = 'Fleet manager analytics fetched successfully';
    return analytics;
  }
  @Get('partner-orders/:partnerId')
  async getPartnerOrdersInSequence(
    @Param('partnerId') partnerId: string,
    @Req() req: Request,
  ) {
    const orders =
      await this.fleetManagerService.getPartnerOrdersInSequence(partnerId);
    req['responseMessage'] = 'Orders for partner fetched in sequence';
    return orders;
  }

  @Get('all-deliveries')
  async getAllRegionDeliveries(
    @Req() req: Request,
    @Query('date') date?: string,
  ) {
    const managerId = req.user['id'];
    const result = await this.fleetManagerService.getAllRegionDeliveries(
      managerId,
      date,
    );
    req['responseMessage'] = 'Region deliveries fetched successfully';
    return result;
  }

  @Post('assign-delivery')
  async assignDelivery(@Body() dto: AssignDeliveryDto, @Req() req: Request) {
    const result = await this.fleetManagerService.assignDelivery(dto);
    req['responseMessage'] = 'Delivery partner assigned successfully';
    return result;
  }

  @Post('create-customer-order')
  async createCustomerOrder(
    @Body() dto: CreateCustomerOrderDto,
    @Req() req: Request,
  ) {
    const result = await this.fleetManagerService.createCustomerOrder(
      dto,
      req.user['id'],
    );
    req['responseMessage'] = 'Customer order created successfully';
    return result;
  }

  @Patch('delivery-sequence/:partnerId')
  async updateDeliverySequence(
    @Param('partnerId') partnerId: string,
    @Body() dto: UpdateDeliverySequenceDto,
    @Req() req: Request,
  ) {
    const updated = await this.fleetManagerService.updateDeliverySequences(
      partnerId,
      dto,
    );
    req['responseMessage'] = 'Delivery sequence updated successfully';
    return updated;
  }

  @Patch('update-customer-order/:orderId')
  async updateCustomerOrder(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateCustomerOrderDto,
    @Req() req: Request,
  ) {
    const updated = await this.fleetManagerService.updateCustomerOrder(
      orderId,
      dto,
    );
    req['responseMessage'] = 'Customer order updated successfully';
    return updated;
  }

  @Patch('update-partner/:partnerId')
  async updatePartnerDetails(
    @Param('partnerId') partnerId: string,
    @Body() dto: UpdatePartnerDetailsDto,
    @Req() req: Request,
  ) {
    const result = await this.fleetManagerService.updatePartnerDetails(
      partnerId,
      dto,
    );
    req['responseMessage'] = 'Delivery partner updated successfully';
    return result;
  }
}
