import {
  BadRequestException,
  Injectable,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { Response } from 'express';

import { ApiResponse } from 'src/common/dto/api-response.dto';
import { PrismaService } from 'src/prisma.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';

@Injectable()
export class UserAccountService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerUserDto: RegisterUserDto, file?: Express.Multer.File) {
    const profileImagePath = file?.path || null;
    const {
      username,
      password,
      full_name,
      email,
      department,
      position,
      create_by,
      role,
    } = registerUserDto;

    const hashedPassword = await argon2.hash(password);

    const existingUser = await this.prisma.user_account.findFirst({
      where: { username },
    });

    if (existingUser) {
      throw new BadRequestException('มีผู้ใช้งานนี้แล้ว');
    }

    let v_admin = 0;
    let v_create = 0;

    switch (role?.toLowerCase()) {
      case 'admin':
        v_admin = 1;
        v_create = 1;
        break;
      case 'staff':
        v_admin = 0;
        v_create = 1;
        break;
      default:
        v_admin = 0;
        v_create = 0;
        break;
    }

    const userData: any = {
      email,
      username,
      password_hash: hashedPassword,
      full_name,
      department,
      position,
      create_by,
      v_admin,
      v_create,
    };

    if (profileImagePath) {
      userData.image = profileImagePath;
    }

    await this.prisma.user_account.create({
      data: userData,
    });

    return new ApiResponse<Partial<any>>('ลงทะเบียนผู้ใช้สำเร็จ', 201, {});
  }

  async login(
    loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { username, password } = loginUserDto;

    const user: any = await this.prisma.user_account.findFirst({
      where: { username },
    });

    if (!user) throw new UnauthorizedException('ไม่พบผู้ใช้งาน');

    const passwordMatch = await argon2.verify(user.password_hash, password);
    if (!passwordMatch) throw new UnauthorizedException('รหัสผ่านไม่ถูกต้อง');

    if (user.status === 1) throw new UnauthorizedException('บัญชีถูกระงับ');

    const roles: string[] = [];
    if (Number(user.v_admin) === 1) roles.push('admin');
    if (Number(user.v_create) === 1) roles.push('staff');
    if (roles.length === 0) roles.push('employee');

    const payload = {
      sub: user.user_id,
      email: user.email,
      roles,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET!,
      expiresIn: '1d',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: '7d',
    });

    await this.prisma.user_account.update({
      where: { user_id: user.user_id },
      data: { refresh_token: refreshToken },
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'เข้าสู่ระบบสำเร็จ',
      roles,
      id: user.user_id,
      username: user.username,
      email: user.email,
    };
  }

  async refresh(
    @Res({ passthrough: true }) res: Response,
    refreshToken: string,
  ) {
    if (!refreshToken) throw new UnauthorizedException('ไม่มี Refresh Token');

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });

      const user = await this.prisma.user_account.findUnique({
        where: { user_id: payload.sub },
      });

      if (!user || user.refresh_token !== refreshToken) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        throw new UnauthorizedException('Refresh Token ไม่ถูกต้อง');
      }

      const newAccessToken = await this.jwtService.signAsync(
        {
          sub: user.user_id,
          email: user.email,
          roles: payload.roles,
        },
        {
          secret: process.env.JWT_SECRET!,
          expiresIn: '1d', // ✅ อายุ 1 วัน
        },
      );

      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // ✅ 1 วัน (หน่วยมิลลิวินาที)
      });

      return new ApiResponse('ออก Token ใหม่สำเร็จ', 200, {});
    } catch (err) {
      console.error('Refresh Error:', err);
      throw new UnauthorizedException('Refresh Token หมดอายุหรือไม่ถูกต้อง');
    }
  }

  async logout(refreshToken: any, res: Response) {
    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync(refreshToken, {
          secret: process.env.JWT_REFRESH_SECRET!,
        });

        await this.prisma.user_account.update({
          where: { user_id: payload.sub },
          data: { refresh_token: null },
        });
      } catch (err) {
        console.error('Logout Error:', err);
        throw new UnauthorizedException('Logout ไม่สำเร็จ');
      }
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return new ApiResponse('ออกจากระบบสำเร็จ', 200, {});
  }

  async readUsers() {
    const users = await this.prisma.user_account.findMany({
      where: { status: 0 },
    });

    const sanitizedUsers = users.map(({ password_hash, ...rest }) => rest);

    return new ApiResponse('เรียกข้อมูลผู้ใช้ทั้งหมด', 200, sanitizedUsers);
  }
}
