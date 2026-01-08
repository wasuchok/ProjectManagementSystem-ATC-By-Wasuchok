import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: [
      'http://10.17.3.244:6565',
      'http://localhost:6565',
      'http://127.0.0.1:6565',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();
  private readonly taskRooms = new Map<string | number, Set<string>>();
  private readonly userUnreadCounts = new Map<string, number>();
  private readonly socketToUser = new Map<string, string>();
  private readonly projectMembers = new Map<string | number, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.detachSocketFromUser(client.id);
    this.detachSocketFromTasks(client.id);
    this.logger.log(`Client disconnected ${client.id}`);
  }

  @SubscribeMessage('registerUser')
  handleRegisterUser(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!userId) return;
    const sockets = this.userSockets.get(userId) ?? new Set<string>();
    sockets.add(client.id);
    this.userSockets.set(userId, sockets);
    this.socketToUser.set(client.id, userId);
    this.logger.log(`Registered user ${userId} with socket ${client.id}`);
  }

  @SubscribeMessage('notifications:markAllRead')
  handleMarkAllRead(
    @MessageBody() userId: string,
  ) {
    if (!userId) return;
    this.userUnreadCounts.set(userId, 0);
    this.sendToUser(userId, 'unreadNotificationCountUpdated', { count: 0 });
  }

  @SubscribeMessage('joinProject')
  handleJoinProject(
    @MessageBody() projectId: string | number,
    @ConnectedSocket() client: Socket,
  ) {
    if (!projectId) return;
    const room = this.projectRoom(projectId);
    client.join(room);
    this.logger.log(`Socket ${client.id} joined ${room}`);
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      const members = this.projectMembers.get(projectId) ?? new Set<string>();
      members.add(userId);
      this.projectMembers.set(projectId, members);
      this.server.to(room).emit('project:presence:update', {
        projectId,
        users: Array.from(members),
        count: members.size,
      });
    }
  }

  @SubscribeMessage('leaveProject')
  handleLeaveProject(
    @MessageBody() projectId: string | number,
    @ConnectedSocket() client: Socket,
  ) {
    if (!projectId) return;
    const room = this.projectRoom(projectId);
    client.leave(room);
    this.logger.log(`Socket ${client.id} left ${room}`);
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      const members = this.projectMembers.get(projectId);
      if (members && members.delete(userId)) {
        if (members.size === 0) {
          this.projectMembers.delete(projectId);
        }
        this.server.to(room).emit('project:presence:update', {
          projectId,
          users: members ? Array.from(members) : [],
          count: members ? members.size : 0,
        });
      }
    }
  }

  @SubscribeMessage('project:cursor:update')
  handleCursorUpdate(
    @MessageBody()
    payload: { projectId: string | number; xRatio: number; yRatio: number },
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload?.projectId) return;
    const room = this.projectRoom(payload.projectId);
    const userId = this.socketToUser.get(client.id);
    if (!userId) return;
    const xRatio = Math.max(0, Math.min(1, Number(payload.xRatio ?? 0)));
    const yRatio = Math.max(0, Math.min(1, Number(payload.yRatio ?? 0)));
    client.to(room).emit('project:cursor:update', {
      projectId: payload.projectId,
      userId,
      xRatio,
      yRatio,
    });
  }


  @SubscribeMessage('joinTask')
  handleJoinTask(
    @MessageBody()
    payload: { taskId: string | number } | string | number,
    @ConnectedSocket() client: Socket,
  ) {
    const taskId = this.extractTaskId(payload);
    if (taskId == null) return;
    const room = this.taskRoom(taskId);
    client.join(room);
    this.registerSocketToTask(taskId, client.id);
    this.logger.debug(`Socket ${client.id} joined ${room}`);
  }

  @SubscribeMessage('leaveTask')
  handleLeaveTask(
    @MessageBody()
    payload: { taskId: string | number } | string | number,
    @ConnectedSocket() client: Socket,
  ) {
    const taskId = this.extractTaskId(payload);
    if (taskId == null) return;
    const room = this.taskRoom(taskId);
    client.leave(room);
    this.unregisterSocketFromTask(taskId, client.id);
    this.logger.debug(`Socket ${client.id} left ${room}`);
  }

  @SubscribeMessage('task:typing:start')
  handleTypingStart(
    @MessageBody()
    payload: {
      taskId: string | number;
      userId: string;
      displayName?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload?.taskId || !payload?.userId) return;
    const room = this.taskRoom(payload.taskId);
    client.to(room).emit('task:typing:start', {
      taskId: payload.taskId,
      userId: payload.userId,
      displayName: payload.displayName ?? payload.userId,
    });
  }

  @SubscribeMessage('task:typing:stop')
  handleTypingStop(
    @MessageBody()
    payload: {
      taskId: string | number;
      userId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload?.taskId || !payload?.userId) return;
    const room = this.taskRoom(payload.taskId);
    client.to(room).emit('task:typing:stop', {
      taskId: payload.taskId,
      userId: payload.userId,
    });
  }

  sendToUser(userId: string, event: string, payload: any) {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) {
      this.logger.debug(`User ${userId} not connected`);
      return;
    }
    for (const socketId of sockets) {
      this.server.to(socketId).emit(event, payload);
    }
  }

  broadcastToProject(projectId: string | number, event: string, payload: any) {
    this.server.to(this.projectRoom(projectId)).emit(event, payload);
  }

  broadcastToTask(taskId: string | number, event: string, payload: any) {
    this.server.to(this.taskRoom(taskId)).emit(event, payload);
  }

  incrementUnreadCount(userId: string, delta = 1) {
    if (!userId) return;
    const current = this.userUnreadCounts.get(userId) ?? 0;
    const next = Math.max(0, current + delta);
    this.userUnreadCounts.set(userId, next);
    this.sendToUser(userId, 'unreadNotificationCountUpdated', { count: next });
  }

  setUnreadCount(userId: string, count: number) {
    if (!userId) return;
    const next = Math.max(0, Number.isFinite(count) ? count : 0);
    this.userUnreadCounts.set(userId, next);
    this.sendToUser(userId, 'unreadNotificationCountUpdated', { count: next });
  }

  private projectRoom(projectId: string | number) {
    return `project:${projectId}`;
  }

  private taskRoom(taskId: string | number) {
    return `task:${taskId}`;
  }

  private extractTaskId(
    input: { taskId: string | number } | string | number,
  ): string | number | null {
    if (input == null) return null;
    if (typeof input === 'object' && 'taskId' in input) {
      return (input as any).taskId;
    }
    return input;
  }

  private registerSocketToTask(taskId: string | number, socketId: string) {
    const sockets = this.taskRooms.get(taskId) ?? new Set<string>();
    sockets.add(socketId);
    this.taskRooms.set(taskId, sockets);
  }

  private unregisterSocketFromTask(taskId: string | number, socketId: string) {
    const sockets = this.taskRooms.get(taskId);
    if (!sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.taskRooms.delete(taskId);
    }
  }

  private detachSocketFromUser(socketId: string) {
    for (const [userId, sockets] of this.userSockets) {
      if (sockets.delete(socketId) && sockets.size === 0) {
        this.userSockets.delete(userId);
        break;
      }
    }
    const user = this.socketToUser.get(socketId);
    if (user) {
      this.socketToUser.delete(socketId);
      for (const [projectId, members] of this.projectMembers) {
        if (members.delete(user)) {
          const room = this.projectRoom(projectId);
          this.server.to(room).emit('project:presence:update', {
            projectId,
            users: Array.from(members),
            count: members.size,
          });
          if (members.size === 0) {
            this.projectMembers.delete(projectId);
          }
        }
      }
    }
  }

  private detachSocketFromTasks(socketId: string) {
    for (const [taskId, sockets] of this.taskRooms) {
      if (sockets.delete(socketId) && sockets.size === 0) {
        this.taskRooms.delete(taskId);
      }
    }
  }
}
