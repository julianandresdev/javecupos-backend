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
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { CreateUserDto } from '../../users/dto/user.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenService } from '../services/refresh-token.service';
import { OTPService } from '../services/token.service';
import { EmailService } from '../services/email.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { UsersService } from '../../users/services/users.service';
import {
  REFRESH_TOKEN_EXPIRY,
  getCookieOptions,
} from '../constants/auth.constants';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { User } from 'src/users/interfaces/user.interface';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { UserStatus } from 'src/users/interfaces/user.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly otpService: OTPService,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto) {
    /**
     * Registrar un nuevo usuario y enviar email de verificación
     * @route POST /auth/register
     * @param {CreateUserDto} createUserDto - Datos del usuario (email, name, password, etc.)
     * @return {Promise<{ message: string; email: string }>} Confirmación de registro
     * @throws {BadRequestException} Si hay error al enviar el email de verificación
     *
     * Flujo:
     * 1. Crear usuario con status PENDING
     * 2. Generar token de verificación válido por 24 horas
     * 3. Enviar email con link de verificación
     * 4. Retornar confirmación (usuario debe verificar email antes de hacer login)
     */
    const user = await this.authService.register(createUserDto);

    try {
      // Token válido por 24 horas (1440 minutos)
      const { token } = await this.otpService.createToken(user.id, 1440);

      await this.emailService.sendVerificationEmail(
        user.email,
        user.name,
        token,
      );

      return {
        message:
          'Usuario registrado exitosamente. Por favor verifica tu email.',
        email: user.email,
      };
    } catch (error) {
      console.error('Error enviando email de verificación:', error);
      throw new BadRequestException(
        'Usuario creado pero hubo un error al enviar el email de verificación. Usa /resend-verification',
      );
    }
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    /**
     * Verificar el email de un usuario mediante token
     * @route GET /auth/verify-email?token=xxx
     * @param {string} token - Token de verificación enviado por email
     * @return {Promise<{ message: string; user: UserResponseDto }>} Confirmación y datos del usuario
     * @throws {BadRequestException} Si el token no se proporciona, es inválido o expiró
     *
     * Este endpoint es llamado cuando el usuario hace clic en el link del email.
     * Cambia el status del usuario de PENDING a ACTIVE y marca el token como usado.
     */
    if (!token) {
      throw new BadRequestException('Token de verificación no proporcionado');
    }

    // Buscar el registro OTP para obtener el userId asociado al token
    const otpRecord = await this.otpService.findByToken(token);

    if (!otpRecord) {
      throw new BadRequestException('Token inválido o expirado');
    }

    // Validar que el token no esté usado y no haya expirado
    await this.otpService.validateToken(otpRecord.userId, token);

    // Activar la cuenta del usuario (PENDING → ACTIVE)
    const result = await this.authService.verifyEmail(otpRecord.userId, token);

    // Marcar el token como usado para prevenir reutilización
    await this.otpService.markTokenAsUsed(otpRecord.userId, token);

    return result;
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: { email: string }) {
    /**
     * Reenviar email de verificación de cuenta
     * @route POST /auth/resend-verification
     * @param {Object} dto - Body con el email del usuario
     * @return {Promise<{ message: string }>} Mensaje de confirmación
     * @throws {BadRequestException} Si la cuenta ya está verificada o hay error al enviar
     *
     * Genera un nuevo token de verificación válido por 24 horas y reenvía el email.
     * Por seguridad, no revela si el email existe o no en el sistema.
     */
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      return {
        message:
          'Si el correo existe, recibirás un nuevo email de verificación',
      };
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Tu cuenta ya está verificada');
    }

    try {
      const { token } = await this.otpService.createToken(user.id, 1440);

      await this.emailService.sendVerificationEmail(
        user.email,
        user.name,
        token,
      );

      return await this.authService.resendVerificationEmail(dto.email);
    } catch (error) {
      console.error('Error reenviando email:', error);
      throw new BadRequestException(
        'Error al reenviar el email de verificación',
      );
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  async login(
    @Body() _dto: LoginDto,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    /**
     * Iniciar sesión y generar tokens de acceso
     * @route POST /auth/login
     * @param {LoginDto} _dto - Credenciales (email y password) - validadas por LocalAuthGuard
     * @param {Request} req - Request object (contiene req.user después de validación)
     * @param {Response} res - Response object para establecer cookies
     * @return {Promise<{ access_token: string }>} JWT de acceso
     *
     * Flujo:
     * 1. LocalAuthGuard valida credenciales y adjunta usuario a req.user
     * 2. Generar JWT access token (válido 15 min)
     * 3. Generar refresh token (válido 7 días) y guardarlo en BD
     * 4. Establecer refresh token como cookie httpOnly
     * 5. Retornar access token en el body
     *
     * El usuario debe tener status ACTIVE para iniciar sesión.
     */
    // Generar ambos tokens (access + refresh)
    const loginResult = await this.authService.login(req.user);

    // ✅ Guardar EL MISMO refresh_token que se genera en loginResult
    await this.refreshTokenService.createRefreshToken(
      req.user.id,
      loginResult.refresh_token, // ⭐ Usar el mismo token
      REFRESH_TOKEN_EXPIRY,
      req.headers['user-agent'],
      req.ip,
    );

    // Establecer refresh token en cookie segura (doble protección)
    res.cookie('refreshToken', loginResult.refresh_token, getCookieOptions());

    return loginResult;
  }
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string, @Request() req) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token no proporcionado');
    }

    try {
      // Validar que el refresh token exista en BD y no haya expirado
      const storedToken =
        await this.refreshTokenService.findToken(refreshToken);

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token inválido o expirado');
      }

      // Verificar y decodificar el JWT
      const payload = await this.authService.verifyRefreshToken(refreshToken);

      // Obtener usuario actualizado
      const user = await this.authService.getUserData(payload.sub);

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Usuario no encontrado o inactivo');
      }

      // Generar NUEVO access_token
      const { access_token } = await this.authService.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Retornar nuevo access_token (refresh_token sigue siendo el mismo)
      return {
        access_token,
        refresh_token: refreshToken, // Retornar el mismo
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: User) {
    /**
     * Obtener perfil del usuario autenticado
     * @route GET /auth/profile
     * @param {User} user - Usuario extraído del JWT por JwtAuthGuard
     * @return {User} Datos completos del usuario autenticado
     *
     * Este endpoint requiere un JWT válido en el header Authorization.
     * El JwtAuthGuard valida el token y adjunta el usuario a req.user.
     */
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser('id') userId: number,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    /**
     * Cerrar sesión del usuario e invalidar refresh token
     * @route POST /auth/logout
     * @param {number} userId - ID del usuario extraído del JWT
     * @param {Request} req - Request object (contiene cookies)
     * @param {Response} res - Response object para limpiar cookies
     * @return {Promise<{ message: string }>} Confirmación de cierre de sesión
     *
     * Este método es idempotente: puede llamarse múltiples veces sin error.
     * Invalida el refresh token en BD y limpia la cookie del navegador.
     * El access token (JWT) sigue siendo válido hasta su expiración natural (15 min).
     */
    const refreshToken = req.cookies?.['refreshToken'];

    if (refreshToken) {
      try {
        await this.refreshTokenService.invalidateRefreshToken(
          refreshToken,
          userId,
        );
      } catch (error) {
        // No fallar el logout si el token ya está inválido
        console.warn(
          `No se pudo invalidar refresh token para usuario ${userId}:`,
          error.message,
        );
      }
    }

    // Limpiar cookie independientemente del resultado anterior
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return { message: 'Sesión cerrada exitosamente' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    /**
     * Solicitar recuperación de contraseña
     * @route POST /auth/forgot-password
     * @param {ForgotPasswordDto} dto - Body con el email del usuario
     * @return {Promise<{ message: string }>} Mensaje genérico de confirmación
     * @throws {BadRequestException} Si hay error al enviar el email
     *
     * Flujo:
     * 1. Verificar si el usuario existe
     * 2. Generar token de recuperación válido por 30 minutos
     * 3. Enviar email con link/código de recuperación
     * 4. Retornar mensaje genérico (no revela si el email existe)
     *
     * Por seguridad, siempre retorna el mismo mensaje independientemente
     * de si el email existe o no (previene enumeración de usuarios).
     */
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      // No revelar si el usuario existe
      return {
        message: 'Si el correo existe, recibirás un código de recuperación',
      };
    }

    try {
      // Token válido por 30 minutos (default en OTPService)
      const { token } = await this.otpService.createToken(user.id);

      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.name,
        token,
      );

      return {
        message: 'Si el correo existe, recibirás un código de recuperación',
      };
    } catch (error) {
      console.error('Error enviando email de recuperación:', error);
      throw new BadRequestException(
        'Error al enviar el correo de recuperación',
      );
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    /**
     * Restablecer contraseña con token de recuperación
     * @route POST /auth/reset-password
     * @param {ResetPasswordDto} dto - Token y nueva contraseña
     * @return {Promise<{ message: string }>} Confirmación de cambio
     * @throws {BadRequestException} Si el token es inválido o expiró
     *
     * Flujo:
     * 1. Buscar el token en la BD para obtener el userId
     * 2. Validar que el token no esté usado y no haya expirado
     * 3. Cambiar la contraseña (hasheada con bcrypt)
     * 4. Marcar el token como usado
     * 5. Revocar todos los refresh tokens del usuario (cierra todas las sesiones)
     *
     * Después de este proceso, el usuario debe volver a iniciar sesión.
     */
    // Obtener userId asociado al token
    const otpRecord = await this.otpService.findByToken(dto.token);

    if (!otpRecord) {
      throw new BadRequestException('Token inválido o expirado');
    }

    // Validar que el token no esté usado y no haya expirado
    await this.otpService.validateToken(otpRecord.userId, dto.token);

    // Cambiar contraseña (se hashea internamente)
    await this.authService.resetPassword(otpRecord.userId, dto.newPassword);

    // Marcar token como usado para prevenir reutilización
    await this.otpService.markTokenAsUsed(otpRecord.userId, dto.token);

    // Cerrar todas las sesiones activas del usuario por seguridad
    await this.refreshTokenService.revokeAllRefreshTokens(otpRecord.userId);

    return {
      message:
        'Contraseña actualizada correctamente. Por favor inicia sesión nuevamente.',
    };
  }
}
