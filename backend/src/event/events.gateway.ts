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

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    for (const [userId, sockets] of this.userSockets) {
      if (sockets.delete(client.id) && sockets.size === 0) {
        this.userSockets.delete(userId);
        break;
      }
    }
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

  private projectRoom(projectId: string | number) {
    return `project:${projectId}`;
  }
}
