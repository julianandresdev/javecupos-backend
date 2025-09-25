import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
