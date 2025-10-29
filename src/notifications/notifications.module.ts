import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entity/notifications.entity';
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from './controller/notifications.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([NotificationEntity]),
    ],
    providers: [NotificationsService],
    controllers: [NotificationsController]
})
export class NotificationsModule {} 
