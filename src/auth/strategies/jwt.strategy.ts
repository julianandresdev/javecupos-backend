import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserStatus } from 'src/users/interfaces/user.interface';
import { UsersService } from 'src/users/services/users.service';

export interface JwtPayload {
  sub: number; // User ID
  email: string;
  role: string;
  iat?: number; // Issued at (opcional, Passport lo añade)
  exp?: number; // Expiration (opcional, Passport lo añade)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extrae "Authorization: Bearer ..."
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'defaultSecret',
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findOne(payload.sub); // lo que devuelvas acá se mete en req.user

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    // ✅ Validar status
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Usuario inactivo');
    }
    return user; // Esto se asigna a req.user
  }
}
