import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { CuposService } from 'src/cupos/services/cupos.service';
import { In, Not, Repository } from 'typeorm';
import { BookingStatus } from '../enums/booking-status.enum';
import { CupoStatus } from 'src/cupos/enum/cupo-status.enum';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    private readonly cuposService: CuposService,
  ) {}
  async create(createBookingDto: CreateBookingDto, userId: number) {
    const searchCupo = await this.cuposService.findOne(createBookingDto.cupoId);

    if (searchCupo.horaSalida < new Date()) {
      throw new BadRequestException(
        'No se pueden reservar cupos en fechas pasadas',
      );
    }
    if (searchCupo.estado !== CupoStatus.DISPONIBLE) {
      throw new BadRequestException('El cupo no está disponible para reservas');
    }

    if (searchCupo.asientosDisponibles < createBookingDto.asientosReservados) {
      throw new NotFoundException('No hay asientos disponibles suficientes');
    }

    await this.cuposService
      .update(createBookingDto.cupoId, {
        asientosDisponibles:
          searchCupo.asientosDisponibles - createBookingDto.asientosReservados,
      })
      .then()
      .catch(() => {
        throw new NotFoundException(
          'Error al actualizar los asientos disponibles del cupo',
        );
      });

    const booking = this.bookingRepository.create({
      ...createBookingDto,
      montoTotal: searchCupo.precio * createBookingDto.asientosReservados,
      userId: userId,
    });
    return this.bookingRepository.save(booking);
  }

  async myBookings(userId: number) {
    const myBookings = this.bookingRepository.find({
      where: { userId },
    });
    if (!myBookings) {
      throw new NotFoundException(
        'No se encontraron reservas para este usuario',
      );
    }
    return myBookings;
  }

  async cancel(id: number, userId: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id, userId },
    });
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    } else if (
      booking.estado == BookingStatus.REJECTED ||
      booking.estado == BookingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Solo se pueden cancelar reservas pendientes o confirmadas',
      );
    }
    await this.bookingRepository.update(id, {
      estado: BookingStatus.CANCELLED,
    });

    try {
      const cupo = await this.cuposService.findOne(booking.cupoId);
      await this.cuposService.update(booking.cupoId, {
        asientosDisponibles:
          cupo.asientosDisponibles + booking.asientosReservados,
      });
    } catch {
      throw new NotFoundException(
        'Error al actualizar los asientos disponibles del cupo',
      );
    }

    return { message: 'Reserva cancelada correctamente', reservaId: id };
  }

  findAll() {
    return this.bookingRepository.find({
      where: {
        estado: Not(
          In([
            BookingStatus.CANCELLED,
            BookingStatus.REJECTED,
            BookingStatus.COMPLETED,
          ]),
        ),
      },
    });
  }

  async confirm(id: number) {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }
    booking.estado = BookingStatus.CONFIRMED;
    return this.bookingRepository.save(booking);
  }

  async reject(id: number) {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }
    booking.estado = BookingStatus.CANCELLED;
    return this.bookingRepository.save(booking);
  }
}
