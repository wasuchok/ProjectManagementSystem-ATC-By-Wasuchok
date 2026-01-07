import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { Response } from 'express';

import { unlink } from 'node:fs/promises';

import { ApiResponse } from 'src/common/dto/api-response.dto';
import { PrismaService } from 'src/prisma.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserAccountDto } from './dto/update-user_account.dto';

@Injectable()
export class UserAccountService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

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
      branch,
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
      sect: branch,
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
      secure: false, // ❗ http
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'เข้าสู่ระบบสำเร็จ',
      roles,
      id: user.user_id,
      username: user.username,
      email: user.email,
      full_name: user.full_name ?? undefined,
    };
  }

  async refresh(
    @Res({ passthrough: true }) res: Response,
    refreshToken: string,
  ) {
    if (!refreshToken) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      throw new UnauthorizedException('ไม่มี Refresh Token');
    }

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
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
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

  async readUsers(
    query: any,
    auth: { userId: string | null; roles: string[] },
  ) {
    const { page = 1, limit = 10, search = '', status, all } = query;

    const normalizedRoles = Array.isArray(auth?.roles)
      ? auth.roles.map((role) => String(role).toLowerCase())
      : [];
    const isAdmin = normalizedRoles.includes('admin');

    const normalizedUserId =
      auth?.userId != null ? String(auth.userId) : null;

    if (!normalizedUserId) {
      throw new UnauthorizedException('ไม่พบข้อมูลผู้ใช้งาน');
    }

    const where: any = {
      AND: [
        status !== undefined ? { status: Number(status) } : {},
        search
          ? {
            OR: [
              { username: { contains: search } },
              { full_name: { contains: search } },
              { email: { contains: search } },
              { department: { contains: search } },
              { position: { contains: search } },
            ],
          }
          : {},
      ],
    };

    if (!isAdmin) {
      where.AND.push({ user_id: normalizedUserId });
    }

    let effectivePage: number;
    let effectiveLimit: number;
    let effectiveTotalPages: number;
    let users: any[];
    let total: number;

    const allowAll = isAdmin && all === 'true';

    if (allowAll) {
      [users, total] = await this.prisma.$transaction([
        this.prisma.user_account.findMany({
          where,
          orderBy: { create_date: 'desc' },
        }),
        this.prisma.user_account.count({ where }),
      ]);
      effectivePage = 1;
      effectiveLimit = total;
      effectiveTotalPages = 1;
    } else {
      const skip = (Number(page) - 1) * Number(limit);
      [users, total] = await this.prisma.$transaction([
        this.prisma.user_account.findMany({
          where,
          skip: skip < 0 ? 0 : skip,
          take: Number(limit),
          orderBy: { create_date: 'desc' },
        }),
        this.prisma.user_account.count({ where }),
      ]);
      effectivePage = Number(page);
      effectiveLimit = Number(limit);
      effectiveTotalPages =
        effectiveLimit > 0 ? Math.ceil(total / effectiveLimit) : 1;
    }

    const sanitizedUsers = users.map(
      ({ password_hash, refresh_token, sect, ...rest }) => ({
        ...rest,
        branch: sect,
      }),
    );

    const responseData =
      allowAll
        ? sanitizedUsers
        : {
          total,
          page: effectivePage,
          totalPages: effectiveTotalPages,
          limit: effectiveLimit,
          data: sanitizedUsers,
        };

    return new ApiResponse('เรียกข้อมูลผู้ใช้ทั้งหมด', 200, responseData);
  }

  async readUserSingle(id: string) {
    const user = await this.prisma.user_account.findUnique({
      where: { user_id: id },
    });

    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้');
    }

    const { password_hash, refresh_token, sect, ...sanitizedUser } = user;

    return new ApiResponse('เรียกข้อมูลผู้ใช้', 200, {
      ...sanitizedUser,
      branch: sect,
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserAccountDto,
    file?: Express.Multer.File,
    currentUserId?: string | null,
  ) {
    const user = await this.prisma.user_account.findUnique({
      where: { user_id: id },
    });

    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้');
    }

    const data: any = {};
    const removeImageFlag = this.normalizeBoolean(updateUserDto.remove_image);
    let deletePreviousImage = false;

    if (
      updateUserDto.username &&
      updateUserDto.username.toLowerCase() !== user.username?.toLowerCase()
    ) {
      const existingUser = await this.prisma.user_account.findFirst({
        where: {
          username: updateUserDto.username,
          NOT: { user_id: id },
        },
      });

      if (existingUser) {
        throw new BadRequestException('มีผู้ใช้งานนี้แล้ว');
      }

      data.username = updateUserDto.username;
    }

    if (updateUserDto.password) {
      data.password_hash = await argon2.hash(updateUserDto.password);
    }

    if (updateUserDto.email !== undefined) {
      data.email = updateUserDto.email;
    }
    if (updateUserDto.full_name !== undefined) {
      data.full_name = updateUserDto.full_name;
    }
    if (updateUserDto.department !== undefined) {
      data.department = updateUserDto.department;
    }
    if (updateUserDto.position !== undefined) {
      data.position = updateUserDto.position;
    }
    if (updateUserDto.branch !== undefined) {
      data.sect = updateUserDto.branch;
    }

    if (updateUserDto.role) {
      const role = updateUserDto.role.toLowerCase();
      data.v_admin = role === 'admin' ? 1 : 0;
      data.v_create = role === 'admin' || role === 'staff' ? 1 : 0;
    }

    if (typeof updateUserDto.status !== 'undefined') {
      const normalizedStatus = Number(updateUserDto.status);
      if (!Number.isNaN(normalizedStatus)) {
        if (
          normalizedStatus === 1 &&
          currentUserId &&
          currentUserId === id
        ) {
          throw new BadRequestException('ไม่สามารถระงับบัญชีตัวเองได้');
        }
        data.status = normalizedStatus;
      }
    }

    if (file) {
      data.image = file.path;
      deletePreviousImage = Boolean(user.image);
    } else if (removeImageFlag) {
      data.image = null;
      deletePreviousImage = Boolean(user.image);
    }

    if (Object.keys(data).length === 0) {
      const { password_hash, refresh_token, ...sanitizedUser } = user;
      return new ApiResponse('ไม่มีข้อมูลที่ต้องอัปเดต', 200, sanitizedUser);
    }

    await this.prisma.user_account.update({
      where: { user_id: id },
      data,
    });

    if (deletePreviousImage) {
      await this.deleteFileIfExists(user.image);
    }

    const updated = await this.prisma.user_account.findUnique({
      where: { user_id: id },
    });

    if (!updated) {
      throw new NotFoundException('ไม่พบผู้ใช้หลังอัปเดต');
    }

    const { password_hash, refresh_token, ...sanitizedUser } = updated;

    return new ApiResponse('อัปเดตข้อมูลผู้ใช้สำเร็จ', 200, sanitizedUser);
  }

  private normalizeBoolean(value?: string | boolean) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }
    return false;
  }

  private async deleteFileIfExists(path?: string | null) {
    if (!path) return;
    try {
      await unlink(path);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        console.error('Failed to delete file', path, error);
      }
    }
  }
}
