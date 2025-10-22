import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway {
    @WebSocketServer() server: Server;


    private userSockets = new Map<string, Set<string>>();

    handleConnection(client: Socket) {
        console.log('Client connected', client.id);
    }

    handleDisconnect(client: Socket) {

        for (const [userId, sockets] of this.userSockets) {
            if (sockets.has(client.id)) {
                sockets.delete(client.id);
                if (sockets.size === 0) this.userSockets.delete(userId);
                break;
            }
        }
        console.log('Client disconnected', client.id);
    }


    @SubscribeMessage('registerUser')
    handleRegisterUser(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
        if (!userId) return;
        const set = this.userSockets.get(userId) ?? new Set<string>();
        set.add(client.id);
        this.userSockets.set(userId, set);
        console.log(`Registered user ${userId} -> socket ${client.id}`);
    }


    sendToUser(userId: string, event: string, payload: any) {
        const sockets = this.userSockets.get(userId);
        if (!sockets || sockets.size === 0) {
            console.log(`User ${userId} not connected`);
            return;
        }
        for (const socketId of sockets) {
            this.server.to(socketId).emit(event, payload);
        }
    }
}
