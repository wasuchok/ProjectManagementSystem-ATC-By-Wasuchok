import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsModule } from 'src/event/events.module';
import { PrismaService } from 'src/prisma.service';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [EventsModule, JwtModule, NotificationsModule],
  controllers: [ProjectController],
  providers: [ProjectService, PrismaService],
})
export class ProjectModule { }
