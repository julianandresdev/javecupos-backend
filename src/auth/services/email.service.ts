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
   * Enviar correo de token link para reset de contraseña
   */
  async sendPasswordResetEmail(
    email: string,
    userName: string,
    token: string,
  ): Promise<void> {
    try {
      // Construir el enlace con el token
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      // HTML del correo
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Hola ${userName},</h2>
          <p>Este link expirará en 30 minutos. Si no solicitaste este código, puedes ignorar este mensaje.</p>
          <p style="margin: 20px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Resetear Contraseña
            </a>
          </p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">Gracias,<br>El equipo de JaveCupos</p>
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
          <p>Tu cuenta en JaveCupos ha sido creada exitosamente.</p>
          <p>Ahora puedes iniciar sesión y empezar a agendar tus cupos.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">El equipo de JaveCupos</p>
        </div>
      `;

      const response = await this.resend.emails.send({
        from: process.env.MAIL_FROM_ADDRESS || 'onboarding@resend.dev',
        to: email,
        subject: 'Bienvenido a JaveCupos',
        html: htmlContent,
      });

      if (response.error) {
        console.error('Error enviando correo de bienvenida:', response.error);
      }
    } catch (error) {
      console.error('Error en sendWelcomeEmail:', error);
    }
  }
  /**
   * ✨ NUEVO: Enviar email de verificación de cuenta
   */
  async sendVerificationEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const verificationLink = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;

    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { 
              display: inline-block; 
              background: #007bff; 
              color: white !important; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>¡Bienvenido a JaveCupos!</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${name}</strong>,</p>
              <p>Gracias por registrarte en JaveCupos. Para activar tu cuenta y comenzar a agendar tus cupos, por favor verifica tu dirección de email.</p>
              <p style="text-align: center;">
                <a href="${verificationLink}" class="button">Verificar mi email</a>
              </p>
              <p style="color: #666; font-size: 14px;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
              <p style="background: #fff; padding: 10px; border: 1px solid #ddd; word-break: break-all; font-size: 12px;">
                ${verificationLink}
              </p>
              <p><strong>⏰ Este enlace expirará en 24 horas.</strong></p>
              <p>Si no te registraste en JaveCupos, puedes ignorar este mensaje.</p>
            </div>
            <div class="footer">
              <p>Gracias,<br><strong>El equipo de JaveCupos</strong></p>
            </div>
          </div>
        </body>
        </html>
      `

      await this.resend.emails.send({
        from: process.env.MAIL_FROM_ADDRESS || 'onboarding@resend.dev',
        to: email,
        subject: '✅ Verifica tu cuenta en JaveCupos',
        html: htmlContent,
      });

      console.log(`✅ Email de verificación enviado a ${email}`);
    } catch (error) {
      console.error('❌ Error enviando email de verificación:', error);
      throw new BadRequestException('Error al enviar email de verificación');
    }
  }
}
