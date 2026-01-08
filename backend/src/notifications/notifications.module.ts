import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from '../common/role/roles.guard';
import { EventsModule } from '../event/events.module';
import { PrismaService } from '../prisma.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [EventsModule, JwtModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, PrismaService, RolesGuard],
  exports: [NotificationsService],
})
export class NotificationsModule { }
