import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWeeklyMenuDto } from './dto/create-weekly-menu.dto';
import { UpdateWeeklyMenuDto } from './dto/update-weekly-menu.dto';

@Injectable()
export class WeeklyMenuService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWeeklyMenuDto) {
    // Check if region exists
    const region = await this.prisma.regions.findUnique({
      where: { id: dto.region_id },
    });
    if (!region) {
      throw new NotFoundException('Region not found');
    }

    // Check if menu for this day and region already exists
    const existingMenu = await this.prisma.weekly_menu.findFirst({
      where: {
        day: dto.day,
        region_id: dto.region_id,
      },
    });
    if (existingMenu) {
      throw new ConflictException(
        `Menu for ${dto.day} already exists in this region`,
      );
    }

    return this.prisma.weekly_menu.create({
      data: dto,
      include: { region: true },
    });
  }

  findAll() {
    return this.prisma.weekly_menu.findMany({
      orderBy: { day: 'asc' },
      include: { region: true },
    });
  }

  findByRegion(regionId: string) {
    return this.prisma.weekly_menu.findMany({
      where: { region_id: regionId },
      orderBy: { day: 'asc' },
      include: { region: true },
    });
  }

  findByDayAndRegion(day: string, regionId: string) {
    return this.prisma.weekly_menu.findFirst({
      where: {
        day,
        region_id: regionId,
      },
      include: { region: true },
    });
  }

  async findByCustomerRegion(customerId: string) {
    // Get customer's region from user data
    const user = await this.prisma.users.findUnique({
      where: { id: customerId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role.name !== 'customer') {
      throw new ConflictException('This endpoint is only for customers');
    }

    if (!user.region_id) {
      throw new ConflictException('Customer region not set');
    }

    return this.findByRegion(user.region_id);
  }

  // Legacy method for backward compatibility
  findByDay(day: string) {
    return this.prisma.weekly_menu.findMany({
      where: { day },
      include: { region: true },
    });
  }

  async update(id: string, dto: UpdateWeeklyMenuDto) {
    const existing = await this.prisma.weekly_menu.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Menu not found');

    // If region_id is being updated, validate the new region
    if (dto.region_id) {
      const region = await this.prisma.regions.findUnique({
        where: { id: dto.region_id },
      });
      if (!region) {
        throw new NotFoundException('Region not found');
      }

      // Check for conflicts with the new region
      if (dto.day || existing.day) {
        const conflictingMenu = await this.prisma.weekly_menu.findFirst({
          where: {
            day: dto.day || existing.day,
            region_id: dto.region_id,
            id: { not: id },
          },
        });
        if (conflictingMenu) {
          throw new ConflictException(
            `Menu for ${dto.day || existing.day} already exists in the target region`,
          );
        }
      }
    }

    return this.prisma.weekly_menu.update({
      where: { id },
      data: dto,
      include: { region: true },
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
