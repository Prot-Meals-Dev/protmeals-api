import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWeeklyMenuDto } from './dto/create-weekly-menu.dto';
import { UpdateWeeklyMenuDto } from './dto/update-weekly-menu.dto';

@Injectable()
export class WeeklyMenuService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateWeeklyMenuDto) {
    return this.prisma.weekly_menu.create({ data: dto });
  }

  findAll() {
    return this.prisma.weekly_menu.findMany({ orderBy: { day: 'asc' } });
  }

  findByDay(day: string) {
    return this.prisma.weekly_menu.findUnique({
      where: { day },
    });
  }

  async update(id: string, dto: UpdateWeeklyMenuDto) {
    const existing = await this.prisma.weekly_menu.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Menu not found');

    return this.prisma.weekly_menu.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.weekly_menu.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Menu not found');

    return this.prisma.weekly_menu.delete({ where: { id } });
  }
}
