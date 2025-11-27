import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationEntity } from '../entity/notifications.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Obtener todas las notificaciones del usuario autenticado
   */
  @Get()
  async getMyNotifications(@Request() req): Promise<NotificationEntity[]> {
    const userId = req.user.sub;
    return this.notificationsService.getUserNotifications(userId);
  }

  /**
   * Obtener notificaciones pendientes (no leídas)
   */
  @Get('pending')
  async getPendingNotifications(@Request() req): Promise<NotificationEntity[]> {
    const userId = req.user.sub;
    return this.notificationsService.getPendingNotifications(userId);
  }

  /**
   * Obtener conteo de notificaciones no leídas
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req): Promise<{ count: number }> {
    const userId = req.user.sub;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  /**
   * Marcar una notificación específica como leída
   */
  @Patch(':id/read')
  async markAsRead(
    @Param('id') notificationId: number,
    @Request() req,
  ): Promise<NotificationEntity> {
    const userId = req.user.sub;
    return this.notificationsService.markAsRead(notificationId, userId);
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  @Patch('mark-all-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(@Request() req): Promise<void> {
    const userId = req.user.sub;
    await this.notificationsService.markAllAsRead(userId);
  }

  /**
   * Eliminar una notificación
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @Param('id') notificationId: number,
    @Request() req,
  ): Promise<void> {
    const userId = req.user.sub;
    await this.notificationsService.deleteNotification(notificationId, userId);
  }

  /**
   * Crear notificación manualmente (solo para testing o admin)
   * En producción, esto normalmente se haría desde otros servicios
   */
  @Post()
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto,
    @Request() req,
  ): Promise<NotificationEntity> {
    // Por defecto, crear para el usuario autenticado
    const userId = createNotificationDto.userId || req.user.sub;

    return this.notificationsService.createNotification(
      userId,
      createNotificationDto.type,
      createNotificationDto.message,
    );
  }
}
