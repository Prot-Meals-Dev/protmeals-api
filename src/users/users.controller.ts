import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Request() req, @Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    req.responseMessage = 'User created successfully';
    return user;
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findAll(@Request() req, @Query('role') role?: string) {
    const users = role
      ? await this.usersService.findByRole(role, req.user.id)
      : await this.usersService.findAll();
    req.responseMessage = 'Users found';
    return users;
  }

  @Get('roles')
  @Public()
  async getRoles(@Request() req) {
    const roles = await this.usersService.findallroles();
    req.responseMessage = 'Roles found';
    return roles;
  }

  @Get('delivery-partner')
  @UseGuards(RolesGuard)
  @Roles('admin', 'fleet_manager')
  async findAllStaff(@Request() req) {
    const user_id = req.user.id;
    if (req.user.role === 'admin') {
      user_id == null;
    }
    const staff = await this.usersService.findByRole('fleet_manager', user_id);
    req.responseMessage = 'Partners found';
    return staff;
  }

  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findOne(req.user.id);
    req.responseMessage = 'User profile found';
    return user;
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findOne(@Request() req, @Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    req.responseMessage = 'User found';
    return user;
  }

  @Patch('profile')
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(req.user.id, updateUserDto);
    req.responseMessage = 'Profile updated successfully';
    return user;
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updated = await this.usersService.update(id, updateUserDto);
    req.responseMessage = 'User updated successfully';
    return updated;
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Request() req, @Param('id') id: string) {
    const result = await this.usersService.remove(id);
    req.responseMessage = 'User deleted successfully';
    return result;
  }
}
