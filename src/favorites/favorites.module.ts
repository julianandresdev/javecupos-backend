import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoritesController } from './controller/favorites.controller';
import { FavoritesService } from './services/favorites.service';
import { FavoriteEntity } from './entities/favorites.entity';
import { CupoEntity } from '../cupos/entities/cupo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FavoriteEntity, CupoEntity])],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
