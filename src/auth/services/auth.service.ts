import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/services/users.service';
import { CreateUserDto, UserResponseDto } from 'src/users/dto/user.dto';
import { UserRole, UserStatus } from 'src/users/interfaces/user.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    /**
     * Registrar un nuevo usuario en el sistema con estado PENDING
     * @route POST /auth/register
     * @param {CreateUserDto} createUserDto - Datos del usuario a crear
     * @return {Promise<UserResponseDto>} Usuario creado (sin JWT, requiere verificación de email)
     *
     * Este método delega la creación del usuario al UsersService, que automáticamente
     * asigna el estado PENDING. El usuario debe verificar su email antes de poder iniciar sesión.
     */
    this.logger.log(`Registrando nuevo usuario: ${createUserDto.email}`);

    const user = await this.usersService.create({
      ...createUserDto,
    });

    return user;
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserResponseDto | null> {
    /**
     * Validar las credenciales de un usuario para autenticación
     * @param {string} email - Email del usuario
     * @param {string} password - Contraseña en texto plano
     * @return {Promise<UserResponseDto | null>} Usuario validado o null si las credenciales son incorrectas
     * @throws {UnauthorizedException} Si la cuenta está pendiente de verificación o inactiva
     *
     * Este método es utilizado por la LocalStrategy de Passport para validar credenciales.
     * Verifica:
     * 1. Que el usuario exista
     * 2. Que la cuenta esté activa (no PENDING ni INACTIVE)
     * 3. Que la contraseña sea correcta
     */
    this.logger.log(`Validando credenciales para: ${email}`);

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      this.logger.warn(`Usuario no encontrado: ${email}`);
      return null;
    }

    // Validar estado de la cuenta
    if (user.status === UserStatus.PENDING) {
      this.logger.warn(`Intento de login con cuenta pendiente: ${email}`);
      throw new UnauthorizedException(
        'Debes verificar tu email antes de iniciar sesión. Revisa tu correo.',
      );
    }

    if (user.status === UserStatus.INACTIVE) {
      this.logger.warn(`Intento de login con cuenta inactiva: ${email}`);
      throw new UnauthorizedException(
        'Tu cuenta está inactiva. Contacta soporte.',
      );
    }

    // Comparar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`Contraseña incorrecta para: ${email}`);
      return null;
    }

    this.logger.log(`Usuario validado exitosamente: ${email}`);
    return user;
  }

  async login(user: {
    id: number;
    email: string;
    role: UserRole;
  }): Promise<any> {
    /**
     * Generar un JWT (access token) para un usuario autenticado
     * @param {Object} user - Datos básicos del usuario autenticado
     * @param {number} user.id - ID del usuario
     * @param {string} user.email - Email del usuario
     * @param {UserRole} user.role - Rol del usuario (ADMIN, REGULAR, etc.)
     * @return {Promise<any>} Objeto con access_token, refresh_token y datos del usuario
     *
     * El JWT contiene el payload: { email, sub: id, role }
     * Expira en 15 minutos (configurado en auth.module.ts)
     */
    this.logger.log(`Generando tokens para usuario ${user.email}...`);

    // Generar ambos tokens
    const { access_token, refresh_token } = await this.generateTokens(user);

    // Preparar el payload seguro del usuario (sin contraseña etc)
    const safeUser = await this.usersService.findOne(user.id);

    return {
      access_token,
      refresh_token,
      user: {
        id: safeUser.id,
        email: safeUser.email,
        name: safeUser.name,
        role: safeUser.role,
        // Agrega aquí otros campos del usuario que quieras exponer al frontend
      },
    };
  }

  async verifyEmail(
    userId: number,
    token: string,
  ): Promise<{ message: string; user: UserResponseDto }> {
    /**
     * Verificar el email de un usuario y activar su cuenta
     * @param {number} userId - ID del usuario a verificar
     * @param {string} token - Token de verificación (no se usa actualmente, pero se mantiene para futuras validaciones)
     * @return {Promise<{ message: string; user: UserResponseDto }>} Mensaje de éxito y datos del usuario actualizado
     * @throws {BadRequestException} Si el usuario no existe o ya está verificado
     *
     * Este método cambia el estado del usuario de PENDING a ACTIVE,
     * permitiéndole iniciar sesión en el sistema.
     */
    this.logger.log(`Verificando email para usuario ID: ${userId}`);

    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.status === UserStatus.ACTIVE) {
      this.logger.warn(`Intento de verificar cuenta ya activa: ${user.email}`);
      throw new BadRequestException(
        'Tu cuenta ya está verificada. Puedes iniciar sesión.',
      );
    }

    // Actualizar status a ACTIVE
    await this.usersService.update(userId, { status: UserStatus.ACTIVE });

    this.logger.log(`Email verificado exitosamente para: ${user.email}`);

    return {
      message: 'Email verificado correctamente. Ya puedes iniciar sesión.',
      user: { ...user, status: UserStatus.ACTIVE },
    };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    /**
     * Solicitar reenvío de email de verificación
     * @param {string} email - Email del usuario
     * @return {Promise<{ message: string }>} Mensaje genérico (no revela si el usuario existe)
     * @throws {BadRequestException} Si la cuenta ya está verificada
     *
     * Por seguridad, este método siempre retorna el mismo mensaje genérico,
     * independientemente de si el usuario existe o no (previene enumeración de cuentas).
     * La lógica de envío de email está en el controlador.
     */
    this.logger.log(`Solicitud de reenvío de verificación para: ${email}`);

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // No revelar si el usuario existe
      return {
        message:
          'Si el correo existe, recibirás un nuevo email de verificación',
      };
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Tu cuenta ya está verificada');
    }

    return {
      message: 'Si el correo existe, recibirás un nuevo email de verificación',
    };
  }

  async resetPassword(
    userId: number,
    newPassword: string,
  ): Promise<{ message: string }> {
    /**
     * Cambiar la contraseña de un usuario (proceso de reset password)
     * @param {number} userId - ID del usuario
     * @param {string} newPassword - Nueva contraseña en texto plano
     * @return {Promise<{ message: string }>} Mensaje de confirmación
     *
     * Este método hashea la nueva contraseña con bcrypt (10 rounds) antes de guardarla.
     * Es utilizado por el flujo de forgot-password después de validar el token OTP.
     */
    this.logger.log(`Cambiando contraseña para usuario ID: ${userId}`);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.usersService.update(userId, {
      password: hashedPassword,
    });

    this.logger.log(
      `Contraseña actualizada exitosamente para usuario ID: ${userId}`,
    );

    return { message: 'Contraseña actualizada correctamente' };
  }
  /**
   * Generar tokens (access y refresh)
   */
  async generateTokens(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    // Access token (expira en 15 minutos)
    const access_token = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_ACCESS_EXPIRATION || ('15m' as any),
    });

    // Refresh token (expira en 7 días)
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || ('7d' as any),
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, // Usar secreto diferente
    });

    return {
      access_token,
      refresh_token,
    };
  }

  /**
   * Refrescar access token usando refresh token
   */
  async refreshToken(refreshToken: string) {
    try {
      // Verificar el refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      });

      // Obtener usuario actualizado
      const user = await this.usersService.findOne(payload.sub);

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Usuario no encontrado o inactivo');
      }

      // Generar nuevo access token
      const newPayload = {
        email: user.email,
        sub: user.id,
        role: user.role,
      };

      const access_token = this.jwtService.sign(newPayload, {
        expiresIn: '15m',
      });

      return {
        access_token,
        refresh_token: refreshToken, // Retornar el mismo refresh token
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }
  async getUserData(userId: number) {
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Retornar solo datos seguros (sin password)
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      age: user.age,
      avatar: user.avatar,
      rate: user.rate,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Verificar refresh token JWT
   */
  async verifyRefreshToken(refreshToken: string) {
    try {
      return this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      });
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    /**
     * Cambiar la contraseña de un usuario autenticado
     * @param {number} userId - ID del usuario
     * @param {string} currentPassword - Contraseña actual en texto plano
     * @param {string} newPassword - Nueva contraseña en texto plano
     * @return {Promise<void>} No retorna nada si el cambio es exitoso
     * @throws {UnauthorizedException} Si la contraseña actual es incorrecta
     *
     * Este método valida la contraseña actual, hashea la nueva y la guarda.
     */

    this.logger.log(`Validando contraseña actual para usuario ID: ${userId}`);

    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Validar contraseña actual
    const isPasswordValid = await this.validateUser(
      user.email,
      currentPassword,
    );

    if (!isPasswordValid) {
      this.logger.warn(
        `Contraseña actual incorrecta para usuario ID: ${userId}`,
      );
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña en la base de datos
    await this.usersService.update(userId, { password: hashedPassword });

    this.logger.log(
      `Contraseña cambiada exitosamente para usuario ID: ${userId}`,
    );
  }
}
