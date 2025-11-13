import { IsEmail, IsNotEmpty, MinLength, IsNumber } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
