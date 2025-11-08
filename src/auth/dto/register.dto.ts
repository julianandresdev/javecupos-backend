import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
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
  password: string;

  @IsNotEmpty()
  name: string; // 👈 puedes ajustarlo a los campos que tenga user.entity.ts

  @IsNotEmpty()
  phone: string;

  @IsNotEmpty()
  age: string;

  @IsNotEmpty()
  role: string;
}
