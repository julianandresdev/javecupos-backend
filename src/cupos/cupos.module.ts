import { Module } from '@nestjs/common';
import { CuposService } from './services/cupos.service';
import { CuposController } from './controllers/cupos.controller';

@Module({
  controllers: [CuposController],
  providers: [CuposService], // <-- Agrega esto, si falta
  exports: [CuposService], // Esto solo si quieres usar el servicio fuera del módulo
})
export class CuposModule {}
