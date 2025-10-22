import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { UserAccountController } from './user_account.controller';
import { UserAccountService } from './user_account.service';

@Module({
  controllers: [UserAccountController],
  providers: [UserAccountService, PrismaService],
  imports: [JwtModule],
})
export class UserAccountModule {}
