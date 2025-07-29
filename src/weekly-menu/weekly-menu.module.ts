import { Module } from '@nestjs/common';
import { WeeklyMenuService } from './weekly-menu.service';
import { WeeklyMenuController } from './weekly-menu.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [WeeklyMenuController],
  providers: [WeeklyMenuService, PrismaService],
})
export class WeeklyMenuModule {}
