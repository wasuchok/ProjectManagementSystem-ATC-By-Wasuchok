import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './event/events.module';
import { PrismaService } from './prisma.service';
import { ProjectModule } from './project/project.module';
import { SettingModule } from './setting/setting.module';
import { UserAccountModule } from './user_account/user_account.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    UserAccountModule,
    ProjectModule,
    SettingModule,
    EventsModule
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
