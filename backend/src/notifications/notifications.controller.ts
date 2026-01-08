import { Controller, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../common/role/roles.decorator';
import { RolesGuard } from '../common/role/roles.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Get()
  @Roles('admin', 'staff', 'employee')
  async findAll(@Req() req: Request, @Query('limit') limit?: number, @Query('offset') offset?: number) {
    const userId = (req as any).user.sub;
    return this.notificationsService.findAll(userId, Number(limit) || 20, Number(offset) || 0);
  }

  @Get('unread-count')
  @Roles('admin', 'staff', 'employee')
  async getUnreadCount(@Req() req: Request) {
    const userId = (req as any).user.sub;
    return { count: await this.notificationsService.getUnreadCount(userId) };
  }

  @Put(':id/read')
  @Roles('admin', 'staff', 'employee')
  async markAsRead(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user.sub;
    return this.notificationsService.markAsRead(Number(id), userId);
  }

  @Put('read-all')
  @Roles('admin', 'staff', 'employee')
  async markAllAsRead(@Req() req: Request) {
    const userId = (req as any).user.sub;
    return this.notificationsService.markAllAsRead(userId);
  }
}
