import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RegionsService } from './regions.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { FilterRegionDto } from './dto/filter-region.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('regions')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateRegionDto) {
    return this.regionsService.create(dto);
  }

  @Get()
  async findAll(@Query() filterDto: FilterRegionDto) {
    return this.regionsService.findAll(filterDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.regionsService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.regionsService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.regionsService.remove(id);
  }
}
