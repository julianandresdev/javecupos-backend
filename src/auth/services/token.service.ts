import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenResetEntity } from '../entities/token-reset.entity';
import * as crypto from 'crypto';

@Injectable()
export class OTPService {
  constructor(
    @InjectRepository(TokenResetEntity)
    private readonly tokenRepository: Repository<TokenResetEntity>,
  ) {}

  /**
   * Generar token único para el enlace de reset
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Crear Token para reset de contraseña
   */
  async createToken(
    userId: number,
    expiresInMinutes: number = 30,
  ): Promise<{ token: string }> {
    // Invalidar OTPs anteriores no usados
    await this.tokenRepository.delete({
      userId,
      used: false,
    });

    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await this.tokenRepository.save({
      token,
      userId,
      expiresAt,
      used: false,
    });

    return { token };
  }

  /**
   * Validar token
   */
  async validateToken(userId: number, token: string): Promise<boolean> {
    const tokenValidation = await this.tokenRepository.findOne({
      where: {
        userId,
        token,
        used: false,
      },
    });

    if (!tokenValidation) {
      throw new BadRequestException('Token de reset inválido');
    }

    // Verificar expiración
    if (tokenValidation.expiresAt < new Date()) {
      throw new BadRequestException('El token ha expirado');
    }

    return true;
  }

  /**
   * Marcar token como usado
   */
  async markTokenAsUsed(userId: number, token: string): Promise<void> {
    await this.tokenRepository.update({ userId, token }, { used: true });
  }

  /**
   * ✨ NUEVO: Buscar por token
   */
  async findByToken(token: string): Promise<TokenResetEntity | null> {
    return await this.tokenRepository.findOne({
      where: { token },
    });
  }

  /**
   * Limpiar Tokens expirados
   */
  async cleanExpiredTokens(): Promise<void> {
    await this.tokenRepository.delete({
      expiresAt: new Date(),
    });
  }
}
