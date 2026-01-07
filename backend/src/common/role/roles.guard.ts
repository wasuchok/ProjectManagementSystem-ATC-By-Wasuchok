import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector, private jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
        if (!requiredRoles) return true;

        const request = context.switchToHttp().getRequest();
        const token = request.cookies['accessToken'];

        if (!token) throw new UnauthorizedException('ไม่มี Token');

        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET!,
            });

            request.user = payload;

            return requiredRoles.some((role) => payload.roles?.includes(role));
        } catch (err: any) {
            if (err?.name === 'TokenExpiredError') {
                throw new UnauthorizedException('TOKEN_EXPIRED');
            }
            throw new UnauthorizedException('TOKEN_INVALID');
        }
    }
}
