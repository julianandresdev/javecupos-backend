import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './services/auth.service';
import { AuthController } from './controller/auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { RefreshTokenService } from './services/refresh-token.service';
import { OTPService } from './services/token.service';
import { EmailService } from './services/email.service';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { TokenResetEntity } from './entities/token-reset.entity';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    TypeOrmModule.forFeature([RefreshTokenEntity, TokenResetEntity]),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m' as any, // Cast para evitar error de tipo
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    RefreshTokenService,
    OTPService,
    EmailService,
  ],
  exports: [AuthService, RefreshTokenService, OTPService, EmailService],
})
export class AuthModule {}
