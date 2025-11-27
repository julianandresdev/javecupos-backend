import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import * as crypto from 'crypto';
import {
  getBogotaDate,
  getBogotaDatePlusMilliseconds,
} from '../../common/utils/date-time.util';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
  ) {}

  /**
   * Crear y guardar un nuevo refresh token
   */
  async createRefreshToken(
    userId: number,
    expiresIn: number = 7 * 24 * 60 * 60 * 1000, // 7 días en ms
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    // Generar token único
    const token = crypto.randomBytes(32).toString('hex');

    // Hash del token para almacenamiento seguro
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = getBogotaDatePlusMilliseconds(expiresIn);

    await this.refreshTokenRepository.save({
      token: hashedToken,
      userId,
      expiresAt,
      userAgent,
      ipAddress,
    });

    // Retornar el token sin hash para enviar al cliente
    return token;
  }

  /**
   * Validar un refresh token
   */
  async validateRefreshToken(token: string, userId: number): Promise<boolean> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const refreshToken = await this.refreshTokenRepository.findOne({
      where: {
        token: hashedToken,
        userId,
      },
    });

    if (!refreshToken) {
      return false;
    }

    // Verificar que no haya expirado
    if (refreshToken.expiresAt < getBogotaDate()) {
      await this.refreshTokenRepository.remove(refreshToken);
      return false;
    }

    return true;
  }

  /**
   * Invalidar un refresh token específico
   */
  async invalidateRefreshToken(token: string, userId: number): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    await this.refreshTokenRepository.delete({
      token: hashedToken,
      userId,
    });
  }

  /**
   * Revocar TODOS los refresh tokens de un usuario
   */
  async revokeAllRefreshTokens(userId: number): Promise<void> {
    await this.refreshTokenRepository.delete({
      userId,
    });
  }

  /**
   * Limpiar tokens expirados
   */
  async cleanExpiredTokens(): Promise<void> {
    await this.refreshTokenRepository.delete({
      expiresAt: getBogotaDate(),
    });
  }
}
