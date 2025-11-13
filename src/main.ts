import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // cookieparser middleware
  app.use(cookieParser());

  // ⬇️ Permitir CORS para todos los orígenes
  app.enableCors({
    origin: [
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'http://localhost:8080',
      'http://localhost:3000',
    ], // añade los frontend que uses
    credentials: true, // si usas cookies o autorización en headers
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  });
  // ✅ CONFIGURAR VALIDACIONES GLOBALES
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Eliminar propiedades no definidas en el DTO
      forbidNonWhitelisted: true, // Lanzar error si se envían propiedades extra
      transform: true, // Transformar automáticamente tipos (string → number)
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error) => console.error(error));
