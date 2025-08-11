import { Module } from '@nestjs/common';
import { WeeklyMenuService } from './weekly-menu.service';
import { WeeklyMenuController } from './weekly-menu.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WeeklyMenuController],
  providers: [WeeklyMenuService],
})
export class WeeklyMenuModule {}
