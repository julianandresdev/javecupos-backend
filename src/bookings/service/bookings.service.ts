import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { CuposService } from 'src/cupos/services/cupos.service';
import { In, Not, Repository } from 'typeorm';
import { BookingStatus } from '../enums/booking-status.enum';
import { CupoStatus } from 'src/cupos/enum/cupo-status.enum';
import { NotificationsService } from 'src/notifications/services/notifications.service';
import { NotificationsType } from 'src/notifications/enum/notifications.enum';
import { getBogotaDate } from '../../common/utils/date-time.util';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    private readonly cuposService: CuposService,
    private readonly notificationsService: NotificationsService,
  ) {}
  async create(createBookingDto: CreateBookingDto, userId: number) {
    const searchCupo = await this.cuposService.findOne(createBookingDto.cupoId);

    if (searchCupo.horaSalida < getBogotaDate()) {
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

    if(userId === searchCupo.conductorId){
      throw new BadRequestException('No puedes reservar un cupo que tú mismo creaste');
    }

    const booking = await this.bookingRepository.create({
      ...createBookingDto,
      montoTotal: searchCupo.precio * createBookingDto.asientosReservados,
      userId,
    });
    await this.bookingRepository.save(booking);
    // 🔥 CARGAR LAS RELACIONES (cupo y user) después de guardar
    const bookingWithRelations = await this.bookingRepository.findOne({
      where: { id: booking.id },
      relations: ['cupo', 'user'], // Cargar ambas relaciones
    });
    if (!bookingWithRelations)
      throw new InternalServerErrorException(
        'Hubo un error de parte del servidor.',
      );

    console.log(`Reserva creada: `, booking);
    // ✅ Enviar notificación al usuario de que la reserva fue creada
    await this.notificationsService.createNotification(
      userId,
      NotificationsType.BOOKING_CREATED,
      `Tu reserva con destino ${bookingWithRelations.cupo.destino} ha sido creada exitosamente.\nTe notificaremos cuando el conductor confirme o cancele la reserva.`,
    );
    // Enviar notificacion al conductor de una nueva reserva
    await this.notificationsService.createNotification(
      bookingWithRelations.cupo.conductorId,
      NotificationsType.BOOKING_CREATED,
      `Tienes una nueva reserva en el cupo con destino a ${bookingWithRelations.cupo.destino}, confirma o rechaza.`,
    );

    this.logger.log(`Reserva creada: ID ${booking.id}`);

    return booking;
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
      // Notificar al usuario que su reserva fue cancelada (por el mismo)
      await this.notificationsService.createNotification(
        userId,
        NotificationsType.CUPO_CANCELLED,
        `Cancelaste tu reserva con destino: ${cupo.destino}`,
      );
      // Notificar al conductor que le cancelaron una reserva
      await this.notificationsService.createNotification(
        cupo.conductorId,
        NotificationsType.CUPO_CANCELLED,
        `El usuario ${booking.user.getDisplayName()} cancelo la reserva para el cupo con destino: ${cupo.destino}`,
      );
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

  async confirm(id: number, userId: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['cupo', 'user'],
    });
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }
    if (userId == booking.userId) {
      throw new UnauthorizedException(
        'Solo el conductor puede confirmar la reserva.',
      );
    }
    booking.estado = BookingStatus.CONFIRMED;

    const updatedBooking = await this.bookingRepository.save(booking);

    // ✅ Enviar notificación de confirmación al condcutor
    await this.notificationsService.createNotification(
      booking.cupo.conductorId, // Confirmarle al conductor que se guardo la reserva al usuario
      NotificationsType.BOOKING_CONFIRMED,
      `Confirmaste la reserva al usuario ${booking.user.getDisplayName()} con destino: ${booking.cupo.destino}.`,
    );
    // Notificar al usuario
    await this.notificationsService.createNotification(
      booking.userId,
      NotificationsType.BOOKING_CONFIRMED,
      `Tu reserva con destino ${booking.cupo.destino} fue confirmada. Tu hora de salida es: ${booking.cupo.horaSalida}.`,
    );
    return updatedBooking;
  }

  async reject(id: number, userId: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['cupo', 'user'],
    });
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }
    if (userId == booking.userId) {
      throw new UnauthorizedException(
        'Solo el conductor puede confirmar la reserva.',
      );
    }
    booking.estado = BookingStatus.CANCELLED;
    const updatedBooking = await this.bookingRepository.save(booking);
    // ✅ Enviar notificación de confirmación
    await this.notificationsService.createNotification(
      booking.cupo.conductorId, // Confirmarle al conductor que se guardo la reserva al usuario
      NotificationsType.BOOKING_CANCELLED,
      `Cancelaste la reserva al usuario ${booking.user.getDisplayName()} con destino: ${booking.cupo.destino}.`,
    );
    await this.notificationsService.createNotification(
      booking.userId,
      NotificationsType.BOOKING_CANCELLED,
      `Tu reserva con destino ${booking.cupo.destino} fue cancelada.`,
    );
    return updatedBooking;
  }
}
