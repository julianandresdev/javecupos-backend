import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        throw new WsException('Token no proporcionado');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Verificar que el userId del token coincide con el del handshake
      const userIdFromHandshake = client.handshake.auth?.userId;

      if (payload.sub !== userIdFromHandshake) {
        throw new WsException('Token no coincide con el usuario');
      }

      // Adjuntar el usuario al socket para uso posterior
      client.data.user = payload;

      return true;
    } catch (error) {
      this.logger.error(`Error en autenticación WebSocket: ${error.message}`);
      throw new WsException('Token inválido');
    }
  }

  private extractTokenFromSocket(client: Socket): string | undefined {
    // El token puede venir en el handshake auth o en el header
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1];
    return token;
  }
}
