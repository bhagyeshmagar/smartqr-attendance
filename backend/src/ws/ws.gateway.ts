import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:5173'],
        credentials: true,
    },
    namespace: '/ws',
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger = new Logger('WsGateway');

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join:session')
    handleJoinSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string },
    ) {
        const room = `session:${data.sessionId}`;
        client.join(room);
        this.logger.log(`Client ${client.id} joined room ${room}`);
        return { event: 'joined', room };
    }

    @SubscribeMessage('leave:session')
    handleLeaveSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string },
    ) {
        const room = `session:${data.sessionId}`;
        client.leave(room);
        this.logger.log(`Client ${client.id} left room ${room}`);
        return { event: 'left', room };
    }

    /**
     * Broadcast a new token to all clients in a session room
     */
    broadcastToken(sessionId: string, token: string) {
        const room = `session:${sessionId}`;
        this.server.to(room).emit('token', { token, timestamp: Date.now() });
        this.logger.debug(`Broadcasted token to room ${room}`);
    }

    /**
     * Broadcast attendance update to all clients in a session room
     */
    broadcastAttendance(
        sessionId: string,
        attendance: {
            userId: string;
            userName: string;
            markedAt: Date;
            phase?: string;
            verificationFlags?: { flagged?: boolean; reason?: string };
        },
    ) {
        const room = `session:${sessionId}`;
        this.server.to(room).emit('attendance', attendance);
        this.logger.debug(`Broadcasted attendance update to room ${room}`);
    }
}
