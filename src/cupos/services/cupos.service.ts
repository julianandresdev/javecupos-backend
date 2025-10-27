import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCupoDto } from '../dto/create-cupo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CupoEntity } from '../entities/cupo.entity';
import {
  FindOptionsWhere,
  In,
  Like,
  MoreThanOrEqual,
  QueryBuilder,
  Repository,
} from 'typeorm';
import { CupoResponseDto } from '../dto/cupo-response.dto';
import { SearchCupoDto } from '../dto/search-cupo.dto';
import { UserRole } from 'src/users/interfaces/user.interface';
import { UpdateCupoDto } from '../dto/update-cupo.dto';
import { CupoStatus } from '../enum/cupo-status.enum';
import { CupoBarrios } from '../enum/cupo-barrios.enum';

@Injectable()
export class CuposService {
  constructor(
    @InjectRepository(CupoEntity)
    private cupoRepository: Repository<CupoEntity>,
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
    if (createCupoDto.horaSalida <= new Date()) {
      throw new BadRequestException('La hora de salida debe ser futura');
    }

    const cupo = this.cupoRepository.create({
      ...createCupoDto,
      conductorId,
    });

    await this.cupoRepository.save(cupo);
    const cupoConConductor = await this.cupoRepository.findOne({
      where: { id: cupo.id },
      relations: [UserRole.DRIVER],
    });
    if (!cupoConConductor) {
      throw new NotFoundException('Cupo no encontrado después de crear');
    }
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
      relations: [UserRole.DRIVER],
    });

    if (!cupo) {
      throw new NotFoundException('Cupo no encontrado');
    }

    return this.mapToResponseDto(cupo);
  }

  async update(
    id: number,
    updateCupoDto: UpdateCupoDto,
  ): Promise<CupoResponseDto> {
    /**
     * Actualiza un cupo existente
     * @param id - ID del cupo a actualizar
     * @param updateCupoDto - Datos para actualizar el cupo
     * @returns DTO del cupo actualizado
     */
    const cupo = await this.cupoRepository.findOne({
      where: { id, activo: true },
    });
    if (!cupo) {
      throw new NotFoundException('Cupo no encontrado');
    }
    Object.assign(cupo, updateCupoDto);
    const updatedCupo = await this.cupoRepository.save(cupo);
    return this.mapToResponseDto(updatedCupo);
  }

  async findByDriver(conductorId: number): Promise<CupoResponseDto[]> {
    /**
     * Busca todos los cupos de un conductor específico
     * @param conductorId - ID del conductor
     * @returns Lista de DTOs de cupos del conductor
     */
    const cupos = await this.cupoRepository.find({
      where: { conductorId, activo: true },
      relations: [UserRole.DRIVER],
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

    this.cupoRepository.delete(id);
    /**
     * Recomendacion para produccion: mejor usar eliminación lógica
     * estableciendo cupo.activo = false y guardando el cambio (soft delete)
     */
    return { message: `Cupo con id ${id} eliminado correctamente` };
  }

  private mapToResponseDto(cupo: CupoEntity): CupoResponseDto {
    /**
     * Convierte una entidad Cupo a un DTO de respuesta
     * @param cupo - Entidad Cupo
     * @returns DTO de respuesta del cupo
     */
    const now = new Date();
    const horaSalida = new Date(cupo.horaSalida);

    // Calcular tiempo para la salida
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
      horaSalida: cupo.horaSalida,
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
  /**
   * Convierte múltiples entidades a DTOs de respuesta
   */
  private mapToResponseDtoArray(cupos: CupoEntity[]): CupoResponseDto[] {
    return cupos.map((cupo) => this.mapToResponseDto(cupo));
  }
}
