import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { CreateUserDto } from '../../users/dto/user.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { LoginDto } from '../dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // 🟢 Registro de usuario
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  // 🟢 Login (usa estrategia Local + genera JWT)
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() _dto: LoginDto, @Request() req) {
    return this.authService.login(req.user);
  }

  // 🟢 Ruta protegida (ejemplo)
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  // 🟡 Logout (opcional, si decides invalidar tokens en frontend)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    // Aquí puedes manejar listas negras de tokens, etc.
    return { message: 'Sesión cerrada exitosamente' };
  }
}
