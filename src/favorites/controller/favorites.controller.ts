import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { FavoritesService } from '../services/favorites.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CupoEntity } from '../../cupos/entities/cupo.entity';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async getMyFavorites(@Request() req): Promise<CupoEntity[]> {
    return this.favoritesService.getUserFavorites(req.user.id);
  }

  @Post(':cupoId')
  async addFavorite(
    @Request() req,
    @Param('cupoId', ParseIntPipe) cupoId: number,
  ) {
    return this.favoritesService.addFavorite(req.user.id, cupoId);
  }

  @Delete(':cupoId')
  async removeFavorite(
    @Request() req,
    @Param('cupoId', ParseIntPipe) cupoId: number,
  ) {
    return this.favoritesService.removeFavorite(req.user.id, cupoId);
  }

  @Get('check/:cupoId')
  async checkFavorite(
    @Request() req,
    @Param('cupoId', ParseIntPipe) cupoId: number,
  ) {
    return this.favoritesService.isFavorite(req.user.id, cupoId);
  }
}
