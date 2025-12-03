import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCupoDto } from '../dto/create-cupo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CupoEntity } from '../entities/cupo.entity';
import { FindOptionsWhere, MoreThanOrEqual, Repository } from 'typeorm';
import { CupoResponseDto } from '../dto/cupo-response.dto';
import { SearchCupoDto } from '../dto/search-cupo.dto';
import { UpdateCupoDto } from '../dto/update-cupo.dto';
import { CupoStatus } from '../enum/cupo-status.enum';
import { CupoBarrios } from '../enum/cupo-barrios.enum';
import { NotificationsService } from 'src/notifications/services/notifications.service';
import { NotificationsType } from 'src/notifications/enum/notifications.enum';
import { getBogotaDate, formatBogotaDate } from '../../common/utils/date-time.util';

@Injectable()
export class CuposService {
  private readonly logger = new Logger(CuposService.name);
  constructor(
    @InjectRepository(CupoEntity)
    private cupoRepository: Repository<CupoEntity>,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    createCupoDto: CreateCupoDto,
    conductorId: number,
  ): Promise<CupoResponseDto> {
    /**
     * Crea un nuevo cupo asociado al conductor autenticado
     * @param createCupoDto - Datos para crear el cupo
     * @param req - Objeto de solicitud que contiene la información del usuario autenticado
     * @returns DTO del cupo creado
     */
    // Validar hora futura
    if (createCupoDto.horaSalida <= getBogotaDate()) {
      throw new BadRequestException('La hora de salida debe ser futura');
    }

    const cupo = this.cupoRepository.create({
      ...createCupoDto,
      conductorId,
    });

    await this.cupoRepository.save(cupo);
    const cupoConConductor = await this.cupoRepository.findOne({
      where: { id: cupo.id },
      relations: ['conductor'],
    });
    if (!cupoConConductor) {
      throw new NotFoundException('Cupo no encontrado después de crear');
    }

    await this.notificationsService.createNotification(
      conductorId,
      NotificationsType.CUPO_CREATED,
      `Tu cupo con destino ${cupo.destino} ha sido creado exitosamente.`,
    );

    return this.mapToResponseDto(cupoConConductor);
  }

  // Ejemplo de uso en métodos del service
  async findAll(searchCupoDto: SearchCupoDto): Promise<CupoResponseDto[]> {
    /**
     * Busca cupos según filtros opcionales
     * @param searchCupoDto - Filtros de búsqueda
     * @returns Lista de DTOs de cupos que coinciden con los filtros
     */
    const {
      destino,
      fechaSalida,
      asientosMinimos,
      precioMaximo,
      precioMinimo,
      estado,
      conductorId,
    } = searchCupoDto;

    // Construcción dinámica del filtro con TypeORM
    const where: FindOptionsWhere<CupoEntity> = {};

    if (destino) where.destino = destino as CupoBarrios;
    if (estado) where.estado = estado as CupoStatus;
    if (conductorId) where.conductorId = conductorId;
    if (fechaSalida) where.horaSalida = MoreThanOrEqual(fechaSalida);

    // Filtros de rango (precios, asientos)
    const query = this.cupoRepository
      .createQueryBuilder('cupo')
      .leftJoinAndSelect('cupo.conductor', 'conductor')
      .where('cupo.activo = :activo', { activo: true });

    if (destino)
      query.andWhere('cupo.destino LIKE :destino', { destino: `%${destino}%` });
    if (estado) query.andWhere('cupo.estado = :estado', { estado });
    if (asientosMinimos)
      query.andWhere('cupo.asientos_disponibles >= :asientosMinimos', {
        asientosMinimos,
      });
    if (precioMaximo && precioMinimo)
      query.andWhere('cupo.precio BETWEEN :min AND :max', {
        min: precioMinimo,
        max: precioMaximo,
      });
    else if (precioMaximo)
      query.andWhere('cupo.precio <= :max', { max: precioMaximo });
    else if (precioMinimo)
      query.andWhere('cupo.precio >= :min', { min: precioMinimo });
    if (conductorId)
      query.andWhere('cupo.conductor_id = :conductorId', { conductorId });

    const cupos = await query.orderBy('cupo.hora_salida', 'ASC').getMany();

    return cupos.map((cupo) => this.mapToResponseDto(cupo));
  }

  async findOne(id: number): Promise<CupoResponseDto> {
    const cupo = await this.cupoRepository.findOne({
      where: { id, activo: true },
      relations: ['conductor'],
    });

    if (!cupo) {
      throw new NotFoundException('Cupo no encontrado');
    }

    return this.mapToResponseDto(cupo);
  }

  async update(
    id: number,
    updateCupoDto: UpdateCupoDto,
    conductorId?: number,
  ): Promise<CupoResponseDto> {
    /**
     * Actualiza un cupo existente
     * @param id - ID del cupo a actualizar
     * @param updateCupoDto - Datos para actualizar el cupo
     * @param conductorId - ID del conductor que intenta actualizar (opcional, para validación de permisos)
     * @returns DTO del cupo actualizado
     */
    const cupo = await this.cupoRepository.findOne({
      where: { id, activo: true },
    });
    if (!cupo) {
      throw new NotFoundException(`Cupo con ID ${id} no encontrado o no está activo`);
    }

    // Validar permisos: solo el conductor dueño puede actualizar
    if (conductorId !== undefined && cupo.conductorId !== conductorId) {
      throw new ForbiddenException(
        'No tienes permisos para actualizar este cupo. Solo el conductor dueño puede modificarlo.',
      );
    }

    // Validar que asientosDisponibles no exceda asientosTotales
    if (
      updateCupoDto.asientosDisponibles !== undefined &&
      updateCupoDto.asientosTotales !== undefined
    ) {
      if (updateCupoDto.asientosDisponibles > updateCupoDto.asientosTotales) {
        throw new BadRequestException(
          `Los asientos disponibles (${updateCupoDto.asientosDisponibles}) no pueden exceder los asientos totales (${updateCupoDto.asientosTotales})`,
        );
      }
    } else if (updateCupoDto.asientosDisponibles !== undefined) {
      // Si solo se actualiza asientosDisponibles, validar contra el valor actual de asientosTotales
      if (updateCupoDto.asientosDisponibles > cupo.asientosTotales) {
        throw new BadRequestException(
          `Los asientos disponibles (${updateCupoDto.asientosDisponibles}) no pueden exceder los asientos totales (${cupo.asientosTotales})`,
        );
      }
    } else if (
      updateCupoDto.asientosTotales !== undefined &&
      updateCupoDto.asientosTotales !== cupo.asientosTotales
    ) {
      // Si cambia el total de asientos y NO se especifica disponibles, ajustar la diferencia
      const delta = updateCupoDto.asientosTotales - cupo.asientosTotales;
      const nuevosDisponibles = cupo.asientosDisponibles + delta;

      if (nuevosDisponibles < 0) {
         throw new BadRequestException(
           `No se pueden reducir los asientos totales a ${updateCupoDto.asientosTotales} porque ya hay reservas activas que exceden esa capacidad.`,
         );
      }
      
      cupo.asientosDisponibles = nuevosDisponibles;
    }

    // Validar que horaSalida siga siendo futura si se actualiza
    if (updateCupoDto.horaSalida !== undefined) {
      const nuevaHoraSalida =
        updateCupoDto.horaSalida instanceof Date
          ? updateCupoDto.horaSalida
          : new Date(updateCupoDto.horaSalida);
      if (nuevaHoraSalida <= getBogotaDate()) {
        throw new BadRequestException(
          'La hora de salida debe ser futura. No se puede actualizar a una fecha pasada.',
        );
      }
    }

    // Antes de aplicar los cambios, detecta las diferencias
    const changes = this.detectModifiedFieldsDetailed(cupo, updateCupoDto);

    // Aplica los cambios y guarda el cupo actualizado
    Object.assign(cupo, updateCupoDto);
    const updatedCupo = await this.cupoRepository.save(cupo);

    // Solo notifica si realmente hubo cambios relevantes
    if (changes.length > 0) {
      const message = this.buildSmartModificationMessage(changes, id);
      await this.notificationsService.createNotification(
        cupo.conductorId,
        NotificationsType.CUPO_MODIFIED,
        message,
      );
    }

    return this.mapToResponseDto(updatedCupo);
  }

  async findByDriver(conductorId: number): Promise<CupoResponseDto[]> {
    /**
     * Busca todos los cupos activos de un conductor específico
     * @param conductorId - ID del conductor
     * @returns Lista de DTOs de cupos del conductor con la relación del conductor cargada
     */
    // Validar que conductorId sea un número válido
    if (!conductorId || isNaN(conductorId)) {
      throw new BadRequestException('ID de conductor inválido');
    }

    const cupos = await this.cupoRepository.find({
      where: { conductorId, activo: true },
      relations: ['conductor'], // ✅ Nombre de la relación en la entidad
      order: { createdAt: 'DESC' },
    });

    return this.mapToResponseDtoArray(cupos);
  }
  async cancelCupo(id: number, usuarioId: number): Promise<CupoResponseDto> {
    /**
     * Cancela un cupo si el usuario es el conductor dueño del cupo
     * @param id - ID del cupo a cancelar
     * @param usuarioId - ID del usuario que intenta cancelar el cupo
     * @returns DTO del cupo cancelado
     */
    const cupo = await this.cupoRepository.findOne({ where: { id } });
    if (!cupo) {
      throw new NotFoundException('Cupo no encontrado');
    }

    // Solo el conductor dueño puede cancelar
    if (cupo.conductorId !== usuarioId) {
      throw new ForbiddenException(
        'No tienes permisos para cancelar este cupo',
      );
    }

    // No volver a cancelar
    if (cupo.estado === CupoStatus.CANCELADO) {
      throw new ForbiddenException('El cupo ya está cancelado');
    }

    cupo.estado = CupoStatus.CANCELADO;
    cupo.activo = false;

    await this.cupoRepository.save(cupo);
    await this.notificationsService.createNotification(
      usuarioId,
      NotificationsType.CUPO_MODIFIED,
      'El cupo fue cancelado.',
    );

    return this.mapToResponseDto(cupo);
  }

  async delete(id: number): Promise<{ message: string }> {
    /**
     * Elimina un cupo por su ID
     * @param id - ID del cupo a eliminar
     * @returns Mensaje de confirmación de eliminación
     */
    const cupo = await this.cupoRepository.findOne({ where: { id } });
    if (!cupo) {
      throw new NotFoundException(`Cupo con id ${id} no encontrado`);
    }

    if (process.env.NODE_ENV == 'development') {
      this.cupoRepository.delete(id);
    }
    if (process.env.NODE_ENV == 'production') {
      cupo.activo = false;
    }

    /**
     * Recomendacion para produccion: mejor usar eliminación lógica
     * estableciendo cupo.activo = false y guardando el cambio (soft delete)
     * ✅ hecho
     */
    return { message: `Cupo con id ${id} eliminado correctamente` };
  }
  /**
   * Convierte una entidad Cupo a un DTO de respuesta
   * @param cupo - Entidad Cupo
   * @returns DTO de respuesta del cupo
   */
  private mapToResponseDto(cupo: CupoEntity): CupoResponseDto {
    const now = getBogotaDate();
    
    // Manejar horaSalida que puede venir como string o Date (por el campo varchar en BD)
    // TypeORM guarda Date como ISO string en UTC cuando el campo es varchar
    let horaSalida: Date;
    if (cupo.horaSalida instanceof Date) {
      // Si ya es Date, usarlo directamente
      horaSalida = cupo.horaSalida;
    } else if (typeof cupo.horaSalida === 'string') {
      // Si es string (viene de BD como varchar), parsearlo
      // SQLite/TypeORM pueden guardar la fecha sin la 'Z' (ej: "2024-11-20 15:00:00")
      // Asumimos que lo que está en BD siempre es UTC (porque el frontend envía UTC)
      let dateString = cupo.horaSalida as string;
      
      // Reemplazar espacio por T si es necesario (formato SQL estándar)
      dateString = dateString.replace(' ', 'T');
      
      // Agregar Z si no la tiene para forzar UTC
      if (!dateString.endsWith('Z') && !dateString.includes('+')) {
        dateString += 'Z';
      }

      const parsed = new Date(dateString);
      // Validar que la fecha sea válida
      if (isNaN(parsed.getTime())) {
        this.logger.warn(`Fecha inválida en horaSalida para cupo ${cupo.id}: ${cupo.horaSalida}`);
        horaSalida = now;
      } else {
        horaSalida = parsed;
      }
    } else {
      // Fallback: usar fecha actual
      this.logger.warn(`horaSalida no es Date ni string para cupo ${cupo.id}`);
      horaSalida = now;
    }

    // Calcular tiempo para la salida (ambas fechas en la misma referencia temporal)
    const tiempoParaSalidaMs = horaSalida.getTime() - now.getTime();
    let tiempoParaSalida: string | undefined;

    if (tiempoParaSalidaMs > 0) {
      const horas = Math.floor(tiempoParaSalidaMs / (1000 * 60 * 60));
      const minutos = Math.floor(
        (tiempoParaSalidaMs % (1000 * 60 * 60)) / (1000 * 60),
      );

      if (horas > 24) {
        const dias = Math.floor(horas / 24);
        tiempoParaSalida = `${dias} día${dias > 1 ? 's' : ''}`;
      } else if (horas > 0) {
        tiempoParaSalida = `${horas}h ${minutos}min`;
      } else {
        tiempoParaSalida = `${minutos} minutos`;
      }
    }

    return {
      id: cupo.id,
      conductorId: cupo.conductorId,
      conductor: cupo.conductor
        ? {
            id: cupo.conductor.id,
            name: cupo.conductor.name,
            phone: cupo.conductor.phone,
            email: cupo.conductor.email,
            role: cupo.conductor.role,
          }
        : undefined,
      destino: cupo.destino,
      descripcion: cupo.descripcion,
      asientosTotales: cupo.asientosTotales,
      asientosDisponibles: cupo.asientosDisponibles,
      horaSalida: horaSalida, // Retornar la fecha parseada correctamente
      precio: cupo.precio,
      estado: cupo.estado,
      activo: cupo.activo,
      puntoEncuentro: cupo.puntoEncuentro,
      telefonoContacto: cupo.telefonoContacto,
      createdAt: cupo.createdAt,
      updatedAt: cupo.updatedAt,
      tiempoParaSalida,
    };
  }

  private mapToResponseDtoArray(cupos: CupoEntity[]): CupoResponseDto[] {
    /**
     * Convierte múltiples entidades a DTOs de respuesta
     */
    return cupos.map((cupo) => this.mapToResponseDto(cupo));
  }

  private detectModifiedFieldsDetailed(
    currentCupo: CupoEntity,
    updateDto: UpdateCupoDto,
  ): Array<{
    field: string;
    oldValue: any;
    newValue: any;
    readableName: string;
  }> {
    /**
     * Detecta cambios entre el Cupo original y el DTO a actualizar.
     * Devuelve lista de objetos { field, oldValue, newValue, readableName }
     */
    const fieldNames: Record<string, string> = {
      origen: 'origen',
      puntoEncuentro: 'lugar de encuentro',
      descripcion: 'descripcion',
      destino: 'destino',
      horaSalida: 'hora de salida',
      asientosDisponibles: 'cupos disponibles',
      precio: 'precio',
    };
    const changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      readableName: string;
    }> = [];
    Object.keys(updateDto).forEach((key) => {
      const newValue = updateDto[key];
      const currentValue = currentCupo[key];
      if (
        newValue !== undefined &&
        newValue !== null &&
        newValue !== currentValue
      ) {
        changes.push({
          field: key,
          oldValue: currentValue,
          newValue,
          readableName: fieldNames[key] || key,
        });
      }
    });
    return changes;
  }

  private buildSmartModificationMessage(
    changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      readableName: string;
    }>,
    cupoId: number,
  ): string {
    /**
     * Devuelve un mensaje combinando campos con valor y campos solo con nombre.
     */
    // Campos donde SI se muestra el valor nuevo:
    const fieldsToShowValue = [
      'precio',
      'cupos disponibles',
      'fecha de salida',
      'hora de salida',
    ];

    // Recolectar texto
    const detailedChanges: string[] = [];
    const simpleChanges: string[] = [];

    changes.forEach((change) => {
      if (fieldsToShowValue.includes(change.readableName)) {
        let displayValue = change.newValue;

        // Formatear fechas para que sean legibles
        if (
          change.readableName === 'hora de salida' ||
          change.readableName === 'fecha de salida'
        ) {
          const dateValue =
            displayValue instanceof Date ? displayValue : new Date(displayValue);
          displayValue = formatBogotaDate(dateValue, 'dd/MM/yyyy hh:mm a');
        }

        // Mostrar el campo y el nuevo valor amigable
        detailedChanges.push(`"${change.readableName}" → "${displayValue}"`);
      } else {
        // Solo nombre del campo
        simpleChanges.push(`"${change.readableName}"`);
      }
    });

    // Armar mensaje combinando ambos tipos de info:
    const parts: string[] = [];
    if (detailedChanges.length > 0) parts.push(detailedChanges.join(', '));
    if (simpleChanges.length > 0) {
      if (simpleChanges.length === 1) {
        parts.push(`se actualizó ${simpleChanges[0]}`);
      } else {
        parts.push(`se actualizaron ${simpleChanges.join(', ')}`);
      }
    }

    return `Tu cupo #${cupoId} fue modificado: ${parts.join(' y ')}.`;
  }
}
