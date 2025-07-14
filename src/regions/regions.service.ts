import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

@Injectable()
export class RegionsService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateRegionDto) {
    return this.prisma.regions.create({ data });
  }

  findAll() {
    return this.prisma.regions.findMany();
  }

  findOne(id: string) {
    return this.prisma.regions.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateRegionDto) {
    const region = await this.prisma.regions.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('Region not found');
    return this.prisma.regions.update({ where: { id }, data });
  }

  async remove(id: string) {
    const region = await this.prisma.regions.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('Region not found');
    return this.prisma.regions.delete({ where: { id } });
  }
}
