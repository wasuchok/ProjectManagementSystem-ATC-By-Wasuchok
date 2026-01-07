import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SettingController } from './setting.controller';
import { SettingService } from './setting.service';

@Module({
  controllers: [SettingController],
  providers: [SettingService, PrismaService],
})
export class SettingModule {}
