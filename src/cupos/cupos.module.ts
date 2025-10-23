import { Module } from '@nestjs/common';
import { CuposController } from './controllers/cupos.controller';

@Module({
  controllers: [CuposController]
})
export class CuposModule {}
