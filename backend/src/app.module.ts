import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './event/events.module';
import { PrismaService } from './prisma.service';
import { ProjectModule } from './project/project.module';
import { UserAccountModule } from './user_account/user_account.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    UserAccountModule,
    ProjectModule,
    EventsModule
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
