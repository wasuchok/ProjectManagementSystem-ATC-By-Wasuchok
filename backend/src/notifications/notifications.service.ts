import { Injectable } from '@nestjs/common';
import { EventsGateway } from '../event/events.gateway';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) { }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message?: string;
    link?: string;
    metadata?: any;
  }) {
    const notification = await this.prisma.tb_notifications.create({
      data: {
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        metadata: data.metadata ?? {},
        is_read: false,
      },
    });

    // Send real-time update
    const count = await this.getUnreadCount(data.userId);
    this.eventsGateway.setUnreadCount(data.userId, count);

    // Also emit the notification itself so the frontend can show a toast or prepend it to the list
    this.eventsGateway.sendToUser(data.userId, 'notification:new', notification);

    return notification;
  }

  async findAll(userId: string, limit = 20, offset = 0) {
    return this.prisma.tb_notifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.tb_notifications.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });
  }

  async markAsRead(id: number, userId: string) {
    await this.prisma.tb_notifications.updateMany({
      where: {
        id,
        user_id: userId,
      },
      data: {
        is_read: true,
      },
    });

    const count = await this.getUnreadCount(userId);
    this.eventsGateway.setUnreadCount(userId, count);

    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.tb_notifications.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    });

    this.eventsGateway.setUnreadCount(userId, 0);

    return { success: true };
  }
}
