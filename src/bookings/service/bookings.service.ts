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
import { DataSource, In, Not, Repository } from 'typeorm';
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
    private readonly dataSource: DataSource,
  ) {}
  async create(createBookingDto: CreateBookingDto, userId: number) {
    // Validar que no exista una reserva activa del mismo usuario para el mismo cupo
    const existingBooking = await this.bookingRepository.findOne({
      where: {
        userId,
        cupoId: createBookingDto.cupoId,
        estado: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
      },
    });

    if (existingBooking) {
      throw new BadRequestException(
        'Ya tienes una reserva activa para este cupo',
      );
    }

    const searchCupo = await this.cuposService.findOne(createBookingDto.cupoId);

    if (!searchCupo.activo) {
      throw new BadRequestException('El cupo no está activo');
    }

    if (searchCupo.horaSalida < getBogotaDate()) {
      throw new BadRequestException(
        'No se pueden reservar cupos en fechas pasadas',
      );
    }
    if (searchCupo.estado !== CupoStatus.DISPONIBLE) {
      throw new BadRequestException('El cupo no está disponible para reservas');
    }

    if (searchCupo.asientosDisponibles < createBookingDto.asientosReservados) {
      throw new BadRequestException('No hay asientos disponibles suficientes');
    }

    if (userId === searchCupo.conductorId) {
      throw new BadRequestException(
        'No puedes reservar un cupo que tú mismo creaste',
      );
    }

    // Usar transacción para crear reserva y actualizar asientos de forma atómica
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Crear la reserva
      const booking = queryRunner.manager.create(BookingEntity, {
        ...createBookingDto,
        montoTotal: searchCupo.precio * createBookingDto.asientosReservados,
        userId,
        estado: BookingStatus.PENDING,
      });
      const savedBooking = await queryRunner.manager.save(BookingEntity, booking);

      // Restar asientos disponibles del cupo
      await queryRunner.manager.update(
        'cupos',
        { id: createBookingDto.cupoId },
        {
          asientosDisponibles:
            searchCupo.asientosDisponibles - createBookingDto.asientosReservados,
        },
      );

      await queryRunner.commitTransaction();

      // Cargar relaciones después de la transacción
      const bookingWithRelations = await this.bookingRepository.findOne({
        where: { id: savedBooking.id },
        relations: ['cupo', 'user'],
      });

      if (!bookingWithRelations) {
        throw new InternalServerErrorException(
          'Hubo un error de parte del servidor al cargar la reserva.',
        );
      }

      this.logger.log(`Reserva creada: ID ${savedBooking.id}`);

      // Enviar notificaciones (fuera de la transacción para no bloquear)
      try {
        await this.notificationsService.createNotification(
          userId,
          NotificationsType.BOOKING_CREATED,
          `Tu reserva con destino ${bookingWithRelations.cupo.destino} ha sido creada exitosamente.\nTe notificaremos cuando el conductor confirme o cancele la reserva.`,
        );
        await this.notificationsService.createNotification(
          bookingWithRelations.cupo.conductorId,
          NotificationsType.BOOKING_CREATED,
          `Tienes una nueva reserva en el cupo con destino a ${bookingWithRelations.cupo.destino}, confirma o rechaza.`,
        );
      } catch (notificationError) {
        this.logger.warn(
          `Error al enviar notificaciones para reserva ${savedBooking.id}:`,
          notificationError,
        );
      }

      return bookingWithRelations;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error al crear reserva: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async myBookings(userId: number) {
    const myBookings = await this.bookingRepository.find({
      where: { userId },
      relations: ['cupo', 'user'],
      order: { createdAt: 'DESC' },
    });
    return myBookings;
  }

  async findOne(id: number, userId: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['cupo', 'cupo.conductor', 'user'],
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Validar que el usuario sea el dueño de la reserva o el conductor del cupo
    if (booking.userId !== userId && booking.cupo.conductorId !== userId) {
      throw new UnauthorizedException(
        'No tienes permiso para ver esta reserva',
      );
    }

    return booking;
  }

  async cancel(id: number, userId: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id, userId },
      relations: ['cupo', 'user'],
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (
      booking.estado === BookingStatus.REJECTED ||
      booking.estado === BookingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Solo se pueden cancelar reservas pendientes o confirmadas',
      );
    }

    // Usar transacción para cancelar reserva y devolver asientos
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Actualizar estado de la reserva
      await queryRunner.manager.update(
        BookingEntity,
        { id },
        { estado: BookingStatus.CANCELLED },
      );

      // Solo devolver asientos si la reserva estaba CONFIRMED
      // Si estaba PENDING, los asientos ya fueron restados al crear, así que también se devuelven
      const cupo = await this.cuposService.findOne(booking.cupoId);
      await queryRunner.manager.update(
        'cupos',
        { id: booking.cupoId },
        {
          asientosDisponibles:
            cupo.asientosDisponibles + booking.asientosReservados,
        },
      );

      await queryRunner.commitTransaction();

      // Notificaciones fuera de la transacción
      try {
        await this.notificationsService.createNotification(
          userId,
          NotificationsType.BOOKING_CANCELLED,
          `Cancelaste tu reserva con destino: ${cupo.destino}`,
        );
        await this.notificationsService.createNotification(
          cupo.conductorId,
          NotificationsType.BOOKING_CANCELLED,
          `El usuario ${booking.user?.name || 'Usuario'} canceló la reserva para el cupo con destino: ${cupo.destino}`,
        );
      } catch (notificationError) {
        this.logger.warn(
          `Error al enviar notificaciones para cancelación de reserva ${id}:`,
          notificationError,
        );
      }

      return { message: 'Reserva cancelada correctamente', reservaId: id };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error al cancelar reserva ${id}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Error al cancelar la reserva: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
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
      relations: ['cupo', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCupoId(cupoId: number, conductorId?: number): Promise<BookingEntity[]> {
    /**
     * Obtiene todas las reservas de un cupo específico
     * @param cupoId - ID del cupo
     * @param conductorId - ID del conductor (opcional, para validar permisos)
     * @returns Lista de reservas del cupo
     */
    // Si se proporciona conductorId, validar que sea el dueño del cupo
    if (conductorId !== undefined) {
      const cupo = await this.cuposService.findOne(cupoId);
      if (cupo.conductorId !== conductorId) {
        throw new UnauthorizedException(
          'Solo el conductor del cupo puede ver sus reservas',
        );
      }
    }

    const bookings = await this.bookingRepository.find({
      where: { cupoId },
      relations: ['cupo', 'user'],
      order: { createdAt: 'DESC' },
    });

    return bookings;
  }

  async confirm(id: number, userId: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['cupo', 'user'],
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Validar que el usuario sea el conductor del cupo
    if (userId !== booking.cupo.conductorId) {
      throw new UnauthorizedException(
        'Solo el conductor del cupo puede confirmar la reserva',
      );
    }

    // Validar que no sea el mismo usuario que hizo la reserva
    if (userId === booking.userId) {
      throw new UnauthorizedException(
        'No puedes confirmar tu propia reserva',
      );
    }

    // Validar estado de la reserva
    if (booking.estado !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `No se puede confirmar una reserva con estado ${booking.estado}. Solo se pueden confirmar reservas pendientes.`,
      );
    }

    // Actualizar estado a CONFIRMED
    // Los asientos ya fueron restados al crear la reserva (PENDING), así que no hay que hacer nada más
    booking.estado = BookingStatus.CONFIRMED;
    const updatedBooking = await this.bookingRepository.save(booking);

    // Notificaciones
    try {
      await this.notificationsService.createNotification(
        booking.cupo.conductorId,
        NotificationsType.BOOKING_CONFIRMED,
        `Confirmaste la reserva al usuario ${booking.user?.name || 'Usuario'} con destino: ${booking.cupo.destino}.`,
      );
      await this.notificationsService.createNotification(
        booking.userId,
        NotificationsType.BOOKING_CONFIRMED,
        `Tu reserva con destino ${booking.cupo.destino} fue confirmada. Tu hora de salida es: ${booking.cupo.horaSalida}.`,
      );
    } catch (notificationError) {
      this.logger.warn(
        `Error al enviar notificaciones para confirmación de reserva ${id}:`,
        notificationError,
      );
    }

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

    // Validar que el usuario sea el conductor del cupo
    if (userId !== booking.cupo.conductorId) {
      throw new UnauthorizedException(
        'Solo el conductor del cupo puede rechazar la reserva',
      );
    }

    // Validar que no sea el mismo usuario que hizo la reserva
    if (userId === booking.userId) {
      throw new UnauthorizedException('No puedes rechazar tu propia reserva');
    }

    // Validar estado de la reserva
    if (booking.estado !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `No se puede rechazar una reserva con estado ${booking.estado}. Solo se pueden rechazar reservas pendientes.`,
      );
    }

    // Usar transacción para rechazar reserva y devolver asientos
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Cambiar estado a REJECTED (no CANCELLED)
      await queryRunner.manager.update(
        BookingEntity,
        { id },
        { estado: BookingStatus.REJECTED },
      );

      // Devolver asientos al cupo (fueron restados al crear la reserva)
      const cupo = await this.cuposService.findOne(booking.cupoId);
      await queryRunner.manager.update(
        'cupos',
        { id: booking.cupoId },
        {
          asientosDisponibles:
            cupo.asientosDisponibles + booking.asientosReservados,
        },
      );

      await queryRunner.commitTransaction();

      // Cargar reserva actualizada
      const updatedBooking = await this.bookingRepository.findOne({
        where: { id },
        relations: ['cupo', 'user'],
      });

      if (!updatedBooking) {
        throw new InternalServerErrorException(
          'Error al cargar la reserva actualizada',
        );
      }

      // Notificaciones fuera de la transacción
      try {
        await this.notificationsService.createNotification(
          booking.cupo.conductorId,
          NotificationsType.BOOKING_CANCELLED,
          `Rechazaste la reserva al usuario ${booking.user?.name || 'Usuario'} con destino: ${booking.cupo.destino}.`,
        );
        await this.notificationsService.createNotification(
          booking.userId,
          NotificationsType.BOOKING_CANCELLED,
          `Tu reserva con destino ${booking.cupo.destino} fue rechazada por el conductor.`,
        );
      } catch (notificationError) {
        this.logger.warn(
          `Error al enviar notificaciones para rechazo de reserva ${id}:`,
          notificationError,
        );
      }

      return updatedBooking;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error al rechazar reserva ${id}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Error al rechazar la reserva: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
