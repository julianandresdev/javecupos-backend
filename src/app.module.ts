import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { UserEntity } from './users/entities/user.entity';
import { AuthModule } from './auth/auth.module';
import { RefreshTokenEntity } from './auth/entities/refresh-token.entity';
import { OTPResetEntity } from './auth/entities/otp-reset.entity';
import { CupoEntity } from './cupos/entities/cupo.entity';
import { BookingEntity } from './bookings/entities/booking.entity';
import { NotificationEntity } from './notifications/entity/notifications.entity';
import { CuposModule } from './cupos/cupos.module';
import { BookingsModule } from './bookings/bookings.module';
import { NotificationsModule } from './notifications/notifications.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  
  
    // 🗄️ Configuración escalable de TypeORM (lee todo del .env)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const dbType = configService.get<string>('DB_TYPE') || 'sqlite';

        const baseConfig = {
          synchronize: configService.get('DB_SYNCHRONIZE') === 'true',
          logging: configService.get('DB_LOGGING') === 'true',
          entities: [
            UserEntity,
            CupoEntity,
            BookingEntity,
            NotificationEntity,
            RefreshTokenEntity,
            OTPResetEntity,
          ],
        };

        // Para SQLite solo necesitamos el archivo de base de datos
        if (dbType === 'sqlite') {
          return {
            type: 'sqlite',
            database: configService.get<string>('DB_DATABASE') || './javecupos.db',
            ...baseConfig,
          };
        } else {
          // Para otras BD (PostgreSQL, MySQL, MariaDB) necesitamos conexión de red
          return {
            type: dbType as 'postgres' | 'mysql' | 'mariadb',
            host: configService.get<string>('DB_HOST') || 'localhost',
            port: parseInt(configService.get<string>('DB_PORT') as string),
            username: configService.get<string>('DB_USERNAME'),
            password: configService.get<string>('DB_PASSWORD'),
            database: configService.get<string>('DB_DATABASE'),
            ...baseConfig,
          } as TypeOrmModuleOptions;
        }
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    CuposModule,
    BookingsModule,
    NotificationsModule
    ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
