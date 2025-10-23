// Poner el de julian
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
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
