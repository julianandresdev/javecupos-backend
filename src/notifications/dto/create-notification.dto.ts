import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { NotificationsType } from '../enum/notifications.enum';

export class CreateNotificationDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsNotEmpty()
  @IsEnum(NotificationsType)
  type: NotificationsType;

  @IsNotEmpty()
  @IsString()
  message: string;
}
