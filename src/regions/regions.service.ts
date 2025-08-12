import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { FilterRegionDto } from './dto/filter-region.dto';
import { ChangeRegionStatusDto } from './dto/change-region-status.dto';

@Injectable()
export class RegionsService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateRegionDto) {
    return this.prisma.regions.create({ data });
  }

  async findAll(filterDto: FilterRegionDto) {
    const {
      name,
      city,
      state,
      country,
      is_serviceable,
      delivery_count,
      customer_count,
    } = filterDto;

    const filters: any = {};

    if (name) filters.name = { contains: name };
    if (city) filters.city = { contains: city };
    if (state) filters.state = { contains: state };
    if (country) filters.country = { contains: country };
    if (is_serviceable !== undefined)
      filters.is_serviceable = is_serviceable === 'true';
    if (delivery_count !== undefined)
      filters.delivery_count = parseInt(delivery_count);
    if (customer_count !== undefined)
      filters.customer_count = parseInt(customer_count);

    return this.prisma.regions.findMany({
      where: filters,
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.regions.findUnique({ where: { id } });
  }

  async findServiceableRegions(includeNonServiceable: boolean = false) {
    const where: any = {};

    if (!includeNonServiceable) {
      where.is_serviceable = true;
    }

    return this.prisma.regions.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, data: UpdateRegionDto) {
    const region = await this.prisma.regions.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('Region not found');
    return this.prisma.regions.update({ where: { id }, data });
  }

  async changeRegionStatus(id: string, changeStatusDto: ChangeRegionStatusDto) {
    // Verify region exists
    const region = await this.prisma.regions.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('Region not found');

    // Update region serviceability status
    const updatedRegion = await this.prisma.regions.update({
      where: { id },
      data: {
        is_serviceable: changeStatusDto.is_serviceable,
      },
    });

    return {
      ...updatedRegion,
      statusChangeReason: changeStatusDto.reason,
      message: `Region serviceability changed to ${changeStatusDto.is_serviceable ? 'serviceable' : 'non-serviceable'}`,
    };
  }

  async remove(id: string) {
    const region = await this.prisma.regions.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('Region not found');
    return this.prisma.regions.delete({ where: { id } });
  }
}
