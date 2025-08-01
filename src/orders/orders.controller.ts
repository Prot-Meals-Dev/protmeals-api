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
  ParseEnumPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, CustomerCreateOrderDto } from './dto/create-order.dto';
import { CustomerFilterOrdersDto } from './dto/customer-filter-orders.dto';
import { order_status_enum } from '@prisma/client';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Post('customer')
  async createCustomerOrder(
    @Body() dto: CustomerCreateOrderDto,
    @Req() req: Request,
  ) {
    const customerId = req.user['id'];
    return this.ordersService.createCustomerOrder(dto, customerId);
  }

  @Get()
  findAll(
    @Query('deliveryPartnerId') deliveryPartnerId?: string,
    @Query('mealType') mealType?: 'breakfast' | 'lunch' | 'dinner',
  ) {
    return this.ordersService.findAll({ deliveryPartnerId, mealType });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.ordersService.findByUser(userId);
  }

  @Get('customer/my-orders')
  async getMyOrders(
    @Query() filters: CustomerFilterOrdersDto,
    @Req() req: Request,
  ) {
    const customerId = req.user['id'];
    return this.ordersService.findCustomerOrders(customerId, filters);
  }

  @Patch(':id/status/:status')
  @UseGuards(RolesGuard)
  @Roles('admin', 'fleet_manager')
  updateStatus(
    @Param('id') id: string,
    @Param('status', new ParseEnumPipe(order_status_enum))
    status: order_status_enum,
    @Req() req: Request,
  ) {
    const user = req.user['id'];
    return this.ordersService.updateStatus(id, status, user);
  }

  @Patch(':id/pause-days')
  @UseGuards(RolesGuard)
  @Roles('admin', 'fleet_manager')
  pauseOrderOnDays(
    @Param('id') id: string,
    @Body() body: { dates: string[] },
    @Req() req: Request,
  ) {
    const userId = req.user['id'];
    const dates = body.dates.map((d) => new Date(d));
    return this.ordersService.pauseOrderOnDays(id, dates, userId);
  }
}
