import { Module } from '@nestjs/common';
import { CuposService } from './services/cupos.service';
import { CuposController } from './controllers/cupos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CupoEntity } from './entities/cupo.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([CupoEntity]), NotificationsModule],
  controllers: [CuposController],
  providers: [CuposService],
  exports: [CuposService],
})
export class CuposModule {}
