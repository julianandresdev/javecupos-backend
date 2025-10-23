import { Injectable, BadRequestException } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor() {
    // Inicializar Resend con la API key
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  /**
   * Enviar correo de OTP para reset de contraseña
   */
  async sendPasswordResetEmail(
    email: string,
    userName: string,
    code: string,
    token: string,
  ): Promise<void> {
    try {
      // Construir el enlace con el token
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      // HTML del correo
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Hola ${userName},</h2>
          <p>Tu código de verificación es:</p>
          <div style="text-align: center; padding: 20px; background-color: #f0f0f0; border-radius: 5px; margin: 20px 0;">
            <h1 style="letter-spacing: 2px; color: #333; margin: 0;">🔐 ${code}</h1>
          </div>
          <p>Este código expirará en 30 minutos. Si no solicitaste este código, puedes ignorar este mensaje.</p>
          <p style="margin: 20px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Resetear Contraseña
            </a>
          </p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">Gracias,<br>El equipo de JavaCupos</p>
        </div>
      `;

      // Enviar con Resend
      const response = await this.resend.emails.send({
        from: process.env.MAIL_FROM_ADDRESS || 'onboarding@resend.dev',
        to: email,
        subject: 'Tu código de verificación',
        html: htmlContent,
      });

      // Verificar si hubo error
      if (response.error) {
        console.error('Error enviando correo con Resend:', response.error);
        throw new BadRequestException('Error al enviar el correo');
      }

      console.log('Correo enviado exitosamente:', response.data);
    } catch (error) {
      console.error('Error en sendPasswordResetEmail:', error);
      throw new BadRequestException('Error al enviar el correo');
    }
  }

  /**
   * Enviar correo de bienvenida (opcional, para futuro uso)
   */
  async sendWelcomeEmail(email: string, userName: string): Promise<void> {
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>¡Bienvenido ${userName}!</h2>
          <p>Tu cuenta en JavaCupos ha sido creada exitosamente.</p>
          <p>Ahora puedes iniciar sesión y empezar a agendar tus cupos.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">El equipo de JavaCupos</p>
        </div>
      `;

      const response = await this.resend.emails.send({
        from: process.env.MAIL_FROM_ADDRESS || 'onboarding@resend.dev',
        to: email,
        subject: 'Bienvenido a JavaCupos',
        html: htmlContent,
      });

      if (response.error) {
        console.error('Error enviando correo de bienvenida:', response.error);
      }
    } catch (error) {
      console.error('Error en sendWelcomeEmail:', error);
    }
  }
}
