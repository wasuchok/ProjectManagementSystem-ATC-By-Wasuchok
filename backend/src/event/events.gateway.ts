import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();
  private readonly taskRooms = new Map<string | number, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.detachSocketFromUser(client.id);
    this.detachSocketFromTasks(client.id);
    this.logger.debug(`Client disconnected ${client.id}`);
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
    this.logger.debug(`Registered user ${userId} with socket ${client.id}`);
  }

  @SubscribeMessage('joinProject')
  handleJoinProject(
    @MessageBody() projectId: string | number,
    @ConnectedSocket() client: Socket,
  ) {
    if (!projectId) return;
    const room = this.projectRoom(projectId);
    client.join(room);
    this.logger.debug(`Socket ${client.id} joined ${room}`);
  }

  @SubscribeMessage('leaveProject')
  handleLeaveProject(
    @MessageBody() projectId: string | number,
    @ConnectedSocket() client: Socket,
  ) {
    if (!projectId) return;
    const room = this.projectRoom(projectId);
    client.leave(room);
    this.logger.debug(`Socket ${client.id} left ${room}`);
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
  }

  private detachSocketFromTasks(socketId: string) {
    for (const [taskId, sockets] of this.taskRooms) {
      if (sockets.delete(socketId) && sockets.size === 0) {
        this.taskRooms.delete(taskId);
      }
    }
  }
}
