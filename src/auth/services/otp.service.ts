import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OTPResetEntity } from '../entities/otp-reset.entity';
import * as crypto from 'crypto';

@Injectable()
export class OTPService {
  constructor(
    @InjectRepository(OTPResetEntity)
    private readonly otpRepository: Repository<OTPResetEntity>,
  ) {}

  /**
   * Generar código OTP de 6 dígitos
   */
  private generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generar token único para el enlace de reset
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Crear OTP para reset de contraseña
   */
  async createOTP(userId: number, expiresInMinutes: number = 30): Promise<{ code: string; token: string }> {
    // Invalidar OTPs anteriores no usados
    await this.otpRepository.delete({
      userId,
      used: false,
    });

    const code = this.generateOTPCode();
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const otp = await this.otpRepository.save({
      code,
      token,
      userId,
      expiresAt,
      used: false,
    });

    return { code, token };
  }

  /**
   * Validar OTP y token
   */
  async validateOTP(userId: number, token: string): Promise<boolean> {
    const otp = await this.otpRepository.findOne({
      where: {
        userId,
        token,
        used: false,
      },
    });

    if (!otp) {
      throw new BadRequestException('Token de reset inválido');
    }

    // Verificar expiración
    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('El token ha expirado');
    }

    return true;
  }

  /**
   * Marcar OTP como usado
   */
  async markOTPAsUsed(userId: number, token: string): Promise<void> {
    await this.otpRepository.update(
      { userId, token },
      { used: true },
    );
  }

  /**
   * Obtener OTP por userId y token
   */
  async findOTP(userId: number, token: string): Promise<OTPResetEntity> {
    const otp = await this.otpRepository.findOne({
      where: {
        userId,
        token,
      },
    });

    if (!otp) {
      throw new BadRequestException('OTP no encontrado');
    }

    return otp;
  }

  /**
   * Limpiar OTPs expirados
   */
  async cleanExpiredOTPs(): Promise<void> {
    await this.otpRepository.delete({
      expiresAt: new Date(),
    });
  }
}
