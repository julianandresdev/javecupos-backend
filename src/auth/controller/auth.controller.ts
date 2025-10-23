import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { CreateUserDto } from '../../users/dto/user.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenService } from '../services/refresh-token.service';
import { OTPService } from '../services/otp.service';
import { EmailService } from '../services/email.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { UsersService } from '../../users/services/users.service';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly otpService: OTPService,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
  ) {}

  // 🟢 Registro de usuario (SIN CAMBIOS, solo añade refresh token)
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto, @Res() res: Response) {
    const result = await this.authService.register(createUserDto);
    
    // ✨ NUEVO: Generar refresh token
    const refreshToken = await this.refreshTokenService.createRefreshToken(
      result.user.id,
    );

    // ✨ NUEVO: Configurar HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    return res.json(result);
  }

  // 🟢 Login (SIN CAMBIOS, solo añade refresh token)
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() _dto: LoginDto, @Request() req, @Res() res: Response) {
    const loginResult = await this.authService.login(req.user);

    // ✨ NUEVO: Generar refresh token
    const refreshToken = await this.refreshTokenService.createRefreshToken(
      req.user.id,
      7 * 24 * 60 * 60 * 1000, // 7 días
      req.headers['user-agent'],
      req.ip,
    );

    // ✨ NUEVO: Configurar HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    return res.json({
      ...loginResult,
      message: 'Login exitoso',
    });
  }

  // 🟢 Ruta protegida (SIN CAMBIOS)
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  // 🔴 Logout (COMPLETAMENTE REEMPLAZADO - Ahora funciona)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req, @Res() res: Response) {
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) {
      throw new BadRequestException('Refresh token no encontrado');
    }

    // ✨ NUEVO: Invalidar el refresh token
    await this.refreshTokenService.invalidateRefreshToken(
      refreshToken,
      req.user.id,
    );

    // ✨ NUEVO: Limpiar cookie
    res.clearCookie('refreshToken');

    return res.json({ message: 'Sesión cerrada exitosamente' });
  }

  // ✨ COMPLETAMENTE NUEVO: Forgot Password
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    // Verificar que el usuario existe
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      // No revelar si el usuario existe o no por seguridad
      return { message: 'Si el correo existe, recibirás un código' };
    }

    try {
      // Generar OTP
      const { code, token } = await this.otpService.createOTP(user.id);

      // Enviar correo con Resend
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.name,
        code,
        token,
      );

      return { message: 'Código de verificación enviado al correo' };
    } catch (error) {
      console.error('Error en forgot-password:', error);
      throw new BadRequestException('Error al enviar el correo');
    }
  }

  // ✨ COMPLETAMENTE NUEVO: Reset Password
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    // Verificar que el usuario existe
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // Validar OTP y token
    await this.otpService.validateOTP(user.id, dto.token);

    // Hash de la nueva contraseña con bcrypt
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Actualizar contraseña del usuario
    await this.usersService.update(user.id, {
      password: hashedPassword,
    });

    // Marcar OTP como usado
    await this.otpService.markOTPAsUsed(user.id, dto.token);

    // Revocar todos los refresh tokens para forzar nuevo login
    await this.refreshTokenService.revokeAllRefreshTokens(user.id);

    return { message: 'Contraseña actualizada correctamente' };
  }
}
