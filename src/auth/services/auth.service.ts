import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/services/users.service';
import { CreateUserDto, UserResponseDto } from 'src/users/dto/user.dto';
import {
  User,
  UserRole,
  UserStatus,
} from 'src/users/interfaces/user.interface';

@Injectable()
export class AuthService {
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
    console.log(`Registrando nuevo usuario: ${createUserDto.email}`);

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
    console.log(`Validando credenciales para: ${email}`);

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      console.warn(`Usuario no encontrado: ${email}`);
      return null;
    }

    // Validar estado de la cuenta
    if (user.status === UserStatus.PENDING) {
      console.warn(`Intento de login con cuenta pendiente: ${email}`);
      throw new UnauthorizedException(
        'Debes verificar tu email antes de iniciar sesión. Revisa tu correo.',
      );
    }

    if (user.status === UserStatus.INACTIVE) {
      console.warn(`Intento de login con cuenta inactiva: ${email}`);
      throw new UnauthorizedException(
        'Tu cuenta está inactiva. Contacta soporte.',
      );
    }

    // Comparar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.warn(`Contraseña incorrecta para: ${email}`);
      return null;
    }

    console.log(`Usuario validado exitosamente: ${email}`);
    return user;
  }

  async login(user: {
    id: number;
    email: string;
    role: UserRole;
  }): Promise<{ access_token: string }> {
    /**
     * Generar un JWT (access token) para un usuario autenticado
     * @param {Object} user - Datos básicos del usuario autenticado
     * @param {number} user.id - ID del usuario
     * @param {string} user.email - Email del usuario
     * @param {UserRole} user.role - Rol del usuario (ADMIN, REGULAR, etc.)
     * @return {Promise<{ access_token: string }>} Token JWT firmado
     *
     * El JWT contiene el payload: { email, sub: id, role }
     * Expira en 15 minutos (configurado en auth.module.ts)
     */
    console.log(`Generando JWT para usuario: ${user.email}`);

    const payload = { email: user.email, sub: user.id, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
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
    console.log(`Verificando email para usuario ID: ${userId}`);

    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.status === UserStatus.ACTIVE) {
      console.warn(`Intento de verificar cuenta ya activa: ${user.email}`);
      throw new BadRequestException(
        'Tu cuenta ya está verificada. Puedes iniciar sesión.',
      );
    }

    // Actualizar status a ACTIVE
    await this.usersService.update(userId, { status: UserStatus.ACTIVE });

    console.log(`Email verificado exitosamente para: ${user.email}`);

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
    console.log(`Solicitud de reenvío de verificación para: ${email}`);

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
    console.log(`Cambiando contraseña para usuario ID: ${userId}`);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.usersService.update(userId, {
      password: hashedPassword,
    });

    console.log(
      `Contraseña actualizada exitosamente para usuario ID: ${userId}`,
    );

    return { message: 'Contraseña actualizada correctamente' };
  }
}
