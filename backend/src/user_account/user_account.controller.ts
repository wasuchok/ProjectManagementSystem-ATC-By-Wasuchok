import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { createMulterOptions } from 'src/common/upload/multer-options.factory';

import { Roles } from 'src/common/role/roles.decorator';
import { RolesGuard } from 'src/common/role/roles.guard';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserAccountService } from './user_account.service';

@Controller('user-account')
@UseGuards(RolesGuard)
export class UserAccountController {
  constructor(private readonly userAccountService: UserAccountService) {}

  @Post('register')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('profile', createMulterOptions('users', 2)))
  register(
    @UploadedFile() file: Express.Multer.File,
    @Body() registerUserDto: RegisterUserDto,
  ) {
    return this.userAccountService.register(registerUserDto, file);
  }

  @Post('login')
  login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.userAccountService.login(loginUserDto, res);
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refreshToken'];

    return this.userAccountService.refresh(res, refreshToken);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refreshToken'];

    return this.userAccountService.logout(refreshToken, res);
  }

  @Get('me')
  @Roles('admin')
  async getMe(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return 'Hello';
  }

  @Get('users')
  @Roles('admin')
  async readUsers(@Query() query) {
    return this.userAccountService.readUsers(query);
  }
}
