import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from '../entity/notifications.entity';
import {
  NotificationStatus,
  NotificationsType,
} from '../enum/notifications.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private notificationRepository: Repository<NotificationEntity>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Crear una nueva notificación
   */
  async createNotification(
    userId: number,
    type: NotificationsType,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<NotificationEntity> {
    const notification = this.notificationRepository.create({
      userId,
      type,
      message,
      isRead: NotificationStatus.PENDING,
      // Si tu entidad soporta metadata, agrégalo aquí
    });

    const savedNotification =
      await this.notificationRepository.save(notification);

    this.logger.log(
      `Notificación creada: ID ${savedNotification.id}, Tipo: ${type}, Usuario: ${userId}`,
    );

    // Emitir evento para que el Gateway lo capture
    this.eventEmitter.emit('notification.created', {
      userId,
      notification: savedNotification,
    });

    return savedNotification;
  }

  /**
   * Obtener todas las notificaciones de un usuario
   */
  async getUserNotifications(userId: number): Promise<NotificationEntity[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener notificaciones pendientes (no leídas)
   */
  async getPendingNotifications(userId: number): Promise<NotificationEntity[]> {
    return this.notificationRepository.find({
      where: {
        userId,
        isRead: NotificationStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(
    notificationId: number,
    userId: number,
  ): Promise<NotificationEntity> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notificación ${notificationId} no encontrada para usuario ${userId}`,
      );
    }

    notification.isRead = NotificationStatus.READ;
    return await this.notificationRepository.save(notification);
  }

  /**
   * Marcar todas las notificaciones de un usuario como leídas
   */
  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: NotificationStatus.PENDING },
      { isRead: NotificationStatus.READ },
    );

    this.logger.log(
      `Todas las notificaciones marcadas como leídas para usuario ${userId}`,
    );
  }

  /**
   * Eliminar una notificación
   */
  async deleteNotification(
    notificationId: number,
    userId: number,
  ): Promise<void> {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException(
        `Notificación ${notificationId} no encontrada`,
      );
    }

    this.logger.log(`Notificación ${notificationId} eliminada`);
  }

  /**
   * Obtener conteo de notificaciones no leídas
   */
  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepository.count({
      where: {
        userId,
        isRead: NotificationStatus.PENDING,
      },
    });
  }
}
