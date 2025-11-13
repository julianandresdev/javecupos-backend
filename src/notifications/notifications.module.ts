import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationEntity } from './entity/notifications.entity';
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from './controller/notifications.controller';
import { NotificationsGateway } from './gateway/notifications.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { NotificationListener } from './listeners/notifications.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity]),
    // Importar JwtModule para validar tokens en WebSocket
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn:
            configService.get<string>('JWT_EXPIRATION') || ('1h' as any),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    NotificationsService,
    NotificationsGateway,
    WsJwtGuard,
    NotificationListener,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService, NotificationsGateway], // Exportar para usar en otros módulos
})
export class NotificationsModule {}
