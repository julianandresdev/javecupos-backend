import { IsNotEmpty, IsString, MinLength, IsEmail } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  token: string; // Token recibido por correo

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}
