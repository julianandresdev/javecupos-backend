import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RatingEntity } from '../entities/rating.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { CreateRatingDto } from '../dto/create-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(RatingEntity)
    private ratingsRepository: Repository<RatingEntity>,
    @InjectRepository(BookingEntity)
    private bookingsRepository: Repository<BookingEntity>,
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  async create(createRatingDto: CreateRatingDto, userId: number): Promise<RatingEntity> {
    const { bookingId, puntuacion } = createRatingDto;

    // Verificar reserva
    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId },
      relations: ['cupo', 'cupo.conductor', 'passenger'],
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Verificar que la reserva esté completada
    if (booking.estado !== 'COMPLETADO') {
      throw new BadRequestException('Solo se pueden calificar viajes completados');
    }

    // Determinar quién califica a quién
    let calificadoId: number;

    if (userId === booking.userId) {
      // Pasajero califica al conductor
      calificadoId = booking.cupo.conductorId;
    } else if (userId === booking.cupo.conductorId) {
      // Conductor califica al pasajero
      calificadoId = booking.userId;
    } else {
      throw new BadRequestException('No participaste en este viaje');
    }

    // Verificar si ya calificó
    const existing = await this.ratingsRepository.findOne({
      where: { bookingId, calificadorId: userId },
    });

    if (existing) {
      throw new ConflictException('Ya has calificado este viaje');
    }

    // Crear calificación
    const rating = this.ratingsRepository.create({
      ...createRatingDto,
      calificadorId: userId,
      calificadoId,
    });

    const savedRating = await this.ratingsRepository.save(rating);

    // Actualizar promedio del usuario calificado (opcional, pero recomendado)
    await this.updateUserRating(calificadoId);

    return savedRating;
  }

  async getRatingsByUser(userId: number): Promise<RatingEntity[]> {
    return this.ratingsRepository.find({
      where: { calificadoId: userId },
      relations: ['calificador'],
      order: { createdAt: 'DESC' },
    });
  }

  async getMyReceivedRatings(userId: number): Promise<RatingEntity[]> {
    return this.getRatingsByUser(userId);
  }

  async getRatingByBooking(bookingId: number): Promise<RatingEntity[]> {
    return this.ratingsRepository.find({
      where: { bookingId },
      relations: ['calificador', 'calificado'],
    });
  }

  private async updateUserRating(userId: number) {
    const ratings = await this.ratingsRepository.find({
      where: { calificadoId: userId },
    });

    if (ratings.length === 0) return;

    const sum = ratings.reduce((acc, curr) => acc + curr.puntuacion, 0);
    const average = parseFloat((sum / ratings.length).toFixed(1));

    await this.usersRepository.update(userId, { rate: average });
  }
}
