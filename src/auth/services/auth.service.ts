import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/services/users.service';
import { UserEntity } from '../../users/entities/user.entity';
import { CreateUserDto } from 'src/users/dto/user.dto';
import { User, UserRole } from 'src/users/interfaces/user.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  //añadido nuevo
    async register(createUserDto: CreateUserDto) {
    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    // Crear usuario usando el servicio de users
    const user = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
    });

    // Generar JWT
    const payload = { email: user.email, sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // Validación de credenciales
  async validateUser(email: string, password: string): Promise<Omit<UserEntity, 'password'> | null> {
    
    const user = await this.usersService.findByEmail(email);
    
    if (user && await bcrypt.compare(password, user.password)) {
      // Excluir la contraseña del objeto antes de devolverlo
      const { password, ...result } = user;
      return result as Omit<UserEntity, 'password'>;
    } else return null
  }


  
  // Generación de JWT (login)
  async login(user: { id: number; email: string; role: UserRole}) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
