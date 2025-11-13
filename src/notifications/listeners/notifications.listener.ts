import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsGateway } from '../gateway/notifications.gateway';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(private readonly notificationsGateway: NotificationsGateway) {}

  @OnEvent('notification.created')
  handleNotificationCreated(payload: { userId: number; notification: any }) {
    this.logger.log(
      `Evento capturado: notification.created para usuario ${payload.userId}`,
    );

    // Enviar notificación en tiempo real a través del Gateway
    const sent = this.notificationsGateway.sendNotificationToUser(
      payload.userId,
      payload.notification,
    );

    if (sent) {
      this.logger.log(
        `Notificación enviada en tiempo real a usuario ${payload.userId}`,
      );
    } else {
      this.logger.log(
        `Usuario ${payload.userId} no conectado, notificación guardada`,
      );
    }
  }
}
