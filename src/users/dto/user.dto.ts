import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';
import { UserRole, UserStatus } from '../interfaces/user.interface';

export class CreateUserDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string; // Nombre del usuario

  @IsEmail({}, { message: 'El correo debe ser una dirección válida' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  email: string; // Correo electrónico del usuario

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'La contraseña debe tener al menos 8 caracteres, incluyendo una letra mayúscula, una letra minúscula, un número y un símbolo',
    },
  )
  password: string; // Contraseña del usuario

  @IsString({ message: 'El teléfono debe ser un número' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  phone: string; // Número de teléfono del usuario

  @IsOptional()
  @IsString({ message: 'El avatar debe ser una cadena de texto' })
  avatar?: string; // URL del avatar del usuario (opcional)

  @IsNumber({}, { message: 'La edad debe ser un número' })
  @IsNotEmpty({ message: 'La edad es obligatoria' })
  age: number; // Edad del usuario

  @IsNotEmpty({ message: 'El rol es obligatorio' })
  @IsEnum(UserRole, { message: 'El rol debe ser un valor válido' })
  role: string; // Rol del usuario (por ejemplo, 'admin', 'user', etc.)
}

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  name?: string; // Nombre del usuario

  @IsOptional()
  @IsEmail({}, { message: 'El correo debe ser una dirección válida' })
  email?: string; // Correo electrónico del usuario

  @IsOptional()
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'La contraseña debe tener al menos 8 caracteres, incluyendo una letra mayúscula, una letra minúscula, un número y un símbolo',
    },
  )
  password?: string; // Contraseña del usuario

  @IsOptional()
  @IsNumber({}, { message: 'El teléfono debe ser un número' })
  phone?: string; // Número de teléfono del usuario

  @IsOptional()
  @IsBoolean({ message: 'El estado en línea debe ser un valor booleano' })
  online?: boolean; // Indica si el usuario está en línea

  @IsOptional()
  @IsString({ message: 'El avatar debe ser una cadena de texto' })
  avatar?: string; // URL del avatar del usuario (opcional)

  @IsOptional()
  @IsNumber({}, { message: 'La edad debe ser un número' })
  age?: number; // Edad del usuario

  @IsOptional()
  @IsEnum(UserRole, { message: 'El rol debe ser un valor válido' })
  role?: string; // Rol del usuario (por ejemplo, 'admin', 'user', etc.)

  @IsOptional()
  @IsEnum(UserStatus, { message: 'El estado debe ser un valor válido' })
  status?: string; // Estado actual del usuario
}

export class SearchUserDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  name?: string; // Nombre del usuario

  @IsOptional()
  @IsEmail({}, { message: 'El correo debe ser una dirección válida' })
  email?: string; // Correo electrónico del usuario

  @IsOptional()
  @IsNumber({}, { message: 'El teléfono debe ser un número' })
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'El rol debe ser un valor válido' })
  role?: string; // Rol del usuario (por ejemplo, 'admin', 'user', etc.)

  @IsOptional()
  @IsEnum(UserStatus, { message: 'El estado debe ser un valor válido' })
  status?: string; // Estado actual del usuario
}

export class UserResponseDto {
  id: number; // ID único del usuario
  name: string; // Nombre del usuario
  email: string; // Correo electrónico del usuario
  phone: string; // Número de teléfono del usuario
  online: boolean; // Indica si el usuario está en línea
  avatar?: string; // URL del avatar del usuario (opcional)
  age: number; // Edad del usuario
  role: string; // Rol del usuario (por ejemplo, 'admin', 'user', etc.)
  status: string; // Estado actual del usuario
  createdAt: Date; // Fecha de creación del usuario
  updatedAt: Date; // Fecha de la última actualización del usuario
}

export class UserResponseDtoBcrypt {
  id: number; // ID único del usuario
  name: string; // Nombre del usuario
  email: string; // Correo electrónico del usuario
  password: string;
  phone: string; // Número de teléfono del usuario
  online: boolean; // Indica si el usuario está en línea
  avatar?: string; // URL del avatar del usuario (opcional)
  age: number; // Edad del usuario
  role: string; // Rol del usuario (por ejemplo, 'admin', 'user', etc.)
  status: string; // Estado actual del usuario
  createdAt: Date; // Fecha de creación del usuario
  updatedAt: Date; // Fecha de la última actualización del usuario
}
