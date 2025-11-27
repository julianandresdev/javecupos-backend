import { NotificationsType } from '../enum/notifications.enum';

export interface NotificationsInterface {
  id: number;
  userId: number;
  type: NotificationsType;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}
