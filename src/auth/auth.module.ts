import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './services/auth.service';
import { AuthController } from './controller/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module'; // 👈 para poder acceder a usuarios
import { LocalStrategy } from './strategies/local.strategy';

// ✨ NUEVO: Importar las nuevas entidades
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { OTPResetEntity } from './entities/otp-reset.entity';
import { RefreshTokenService } from './services/refresh-token.service';
import { OTPService } from './services/otp.service';
import { EmailService } from './services/email.service';

@Module({
  imports: [
    UsersModule,
    PassportModule, // Necesario para guards y estrategia JWT
    // ✨ NUEVO: Agregar TypeOrmModule para las nuevas entidades
    TypeOrmModule.forFeature([RefreshTokenEntity, OTPResetEntity,]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'defaultSecret',
      signOptions: { expiresIn: '15m' }, // ⚠️ CAMBIO: Reducido a 15min (recomendado con refresh tokens)
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    // ✨ NUEVO: Agregar los nuevos servicios
    RefreshTokenService,
    OTPService,
    EmailService,
  ],
  exports: [
    AuthService,
    // ✨ NUEVO: Exportar los nuevos servicios si otros módulos los necesitan
    RefreshTokenService,
    OTPService,
    EmailService,
  ],
})
export class AuthModule {}
