import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteEntity } from '../entities/favorites.entity';
import { CupoEntity } from '../../cupos/entities/cupo.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(FavoriteEntity)
    private favoritesRepository: Repository<FavoriteEntity>,
    @InjectRepository(CupoEntity)
    private cuposRepository: Repository<CupoEntity>,
  ) {}

  async getUserFavorites(userId: number): Promise<CupoEntity[]> {
    const favorites = await this.favoritesRepository.find({
      where: { userId },
      relations: ['cupo', 'cupo.conductor'],
      order: { createdAt: 'DESC' },
    });

    return favorites.map((fav) => fav.cupo);
  }

  async addFavorite(userId: number, cupoId: number): Promise<{ message: string }> {
    // Verificar que el cupo existe
    const cupo = await this.cuposRepository.findOne({ where: { id: cupoId } });
    if (!cupo) {
      throw new NotFoundException('Cupo no encontrado');
    }

    // Verificar si ya es favorito
    const existing = await this.favoritesRepository.findOne({
      where: { userId, cupoId },
    });

    if (existing) {
      throw new ConflictException('El cupo ya está en tus favoritos');
    }

    const favorite = this.favoritesRepository.create({
      userId,
      cupoId,
    });

    await this.favoritesRepository.save(favorite);

    return { message: 'Cupo agregado a favoritos' };
  }

  async removeFavorite(userId: number, cupoId: number): Promise<{ message: string }> {
    const result = await this.favoritesRepository.delete({ userId, cupoId });

    if (result.affected === 0) {
      throw new NotFoundException('Favorito no encontrado');
    }

    return { message: 'Cupo eliminado de favoritos' };
  }

  async isFavorite(userId: number, cupoId: number): Promise<{ isFavorite: boolean }> {
    const count = await this.favoritesRepository.count({
      where: { userId, cupoId },
    });

    return { isFavorite: count > 0 };
  }
}
