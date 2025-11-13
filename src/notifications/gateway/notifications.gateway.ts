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
import { Logger, UseGuards } from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';

// Guard para autenticar WebSocket (lo crearemos después)
import { WsJwtGuard } from '../guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // Mapa para rastrear usuarios conectados: userId -> socketId[]
  private connectedUsers = new Map<number, string[]>();

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Maneja la conexión de un cliente WebSocket
   */
  async handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);

    // Extraer userId del handshake (enviado desde el cliente)
    const userId = client.handshake.auth?.userId;

    if (!userId) {
      this.logger.warn(`Cliente ${client.id} sin userId, desconectando...`);
      client.disconnect();
      return;
    }

    // Registrar la conexión del usuario
    this.registerUserConnection(userId, client.id);

    // Unir al cliente a una sala privada con su userId
    client.join(`user:${userId}`);

    this.logger.log(
      `Usuario ${userId} conectado con socket ${client.id}. Total sockets: ${this.connectedUsers.get(userId)?.length || 0}`,
    );

    // Enviar notificaciones pendientes al conectarse
    await this.sendPendingNotifications(userId, client);
  }

  /**
   * Maneja la desconexión de un cliente WebSocket
   */
  handleDisconnect(client: Socket) {
    const userId = client.handshake.auth?.userId;

    if (userId) {
      this.unregisterUserConnection(userId, client.id);
      this.logger.log(
        `Usuario ${userId} desconectado. Sockets restantes: ${this.connectedUsers.get(userId)?.length || 0}`,
      );
    }

    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  /**
   * Registrar una conexión de usuario
   */
  private registerUserConnection(userId: number, socketId: string) {
    const userSockets = this.connectedUsers.get(userId) || [];
    userSockets.push(socketId);
    this.connectedUsers.set(userId, userSockets);
  }

  /**
   * Desregistrar una conexión de usuario
   */
  private unregisterUserConnection(userId: number, socketId: string) {
    const userSockets = this.connectedUsers.get(userId) || [];
    const updatedSockets = userSockets.filter((id) => id !== socketId);

    if (updatedSockets.length === 0) {
      this.connectedUsers.delete(userId);
    } else {
      this.connectedUsers.set(userId, updatedSockets);
    }
  }

  /**
   * Enviar notificaciones pendientes al usuario cuando se conecta
   */
  private async sendPendingNotifications(userId: number, client: Socket) {
    try {
      const pendingNotifications =
        await this.notificationsService.getPendingNotifications(userId);

      if (pendingNotifications.length > 0) {
        client.emit('pending-notifications', pendingNotifications);
        this.logger.log(
          `Enviadas ${pendingNotifications.length} notificaciones pendientes a usuario ${userId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error enviando notificaciones pendientes a usuario ${userId}:`,
        error,
      );
    }
  }

  /**
   * El cliente marca una notificación como leída
   */
  @SubscribeMessage('mark-as-read')
  @UseGuards(WsJwtGuard)
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: number },
  ) {
    const userId = client.handshake.auth?.userId;

    try {
      await this.notificationsService.markAsRead(data.notificationId, userId);

      client.emit('notification-read', {
        notificationId: data.notificationId,
        success: true,
      });

      this.logger.log(
        `Notificación ${data.notificationId} marcada como leída por usuario ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error marcando notificación como leída: ${error.message}`,
      );
      client.emit('notification-read', {
        notificationId: data.notificationId,
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Obtener todas las notificaciones del usuario
   */
  @SubscribeMessage('get-notifications')
  @UseGuards(WsJwtGuard)
  async handleGetNotifications(@ConnectedSocket() client: Socket) {
    const userId = client.handshake.auth?.userId;

    try {
      const notifications =
        await this.notificationsService.getUserNotifications(userId);
      client.emit('notifications-list', notifications);
    } catch (error) {
      this.logger.error(`Error obteniendo notificaciones: ${error.message}`);
      client.emit('error', { message: 'Error al obtener notificaciones' });
    }
  }

  /**
   * Método público para enviar notificación a un usuario específico
   * Este método será llamado desde otros servicios
   */
  sendNotificationToUser(userId: number, notification: any) {
    const isUserConnected = this.connectedUsers.has(userId);

    if (isUserConnected) {
      // Enviar a la sala del usuario (todos sus sockets)
      this.server.to(`user:${userId}`).emit('new-notification', notification);

      this.logger.log(
        `Notificación enviada en tiempo real a usuario ${userId}: ${notification.type}`,
      );
      return true;
    } else {
      this.logger.log(
        `Usuario ${userId} no conectado. Notificación guardada para entrega posterior.`,
      );
      return false;
    }
  }

  /**
   * Enviar notificación broadcast a todos los usuarios conectados
   */
  sendBroadcastNotification(notification: any) {
    this.server.emit('broadcast-notification', notification);
    this.logger.log(`Notificación broadcast enviada: ${notification.type}`);
  }

  /**
   * Verificar si un usuario está conectado
   */
  isUserConnected(userId: number): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Obtener cantidad de usuarios conectados
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }
}
