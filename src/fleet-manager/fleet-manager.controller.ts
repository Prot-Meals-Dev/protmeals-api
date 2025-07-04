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
import { ResponseService } from 'src/response/response.service';
import { CreateCustomerOrderDto } from './dto/create-customer-order.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('fleet_manager')
@Controller('fleet-manager')
export class FleetManagerController {
  constructor(
    private readonly fleetManagerService: FleetManagerService,
    private readonly resposneService: ResponseService,
  ) {}

  @Post('create-partner')
  async createPartner(@Body() dto: CreatePartnerDto, @Request() req) {
    const fleetManagerId = req.user.id;
    const deleveryPartner =
      await this.fleetManagerService.createDeliveryPartner(dto, fleetManagerId);
    return this.resposneService.successResponse(
      'Delevery partner created successfully ',
      deleveryPartner,
    );
  }

  @Get('orders')
  async getRegionOrders(@Request() req) {
    const userId = req.user.id;
    const orderlist = await this.fleetManagerService.getOrdersByRegion(userId); 
    return this.resposneService.successResponse('order list', orderlist);
  }

  @Post('assign-delivery')
  async assignDelivery(@Body() dto: AssignDeliveryDto) {
    return this.fleetManagerService.assignDelivery(dto);
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
    return this.resposneService.successResponse('Order created', result);
  }
}
