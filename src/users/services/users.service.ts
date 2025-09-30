import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { UserRole, UserStatus } from '../interfaces/user.interface';
import {
  CreateUserDto,
  SearchUserDto,
  UpdateUserDto,
  UserResponseDto,
} from '../dto/user.dto';
@Injectable()
export class UsersService {
  /**
   * Constructor del servicio de usuarios
   * @param userRepository Inyecta el repositorio de usuarios para interactuar con la base de datos
   */
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async getAll(): Promise<UserResponseDto[]> {
    /**
     *
     * @returns {Promise<UserResponseDto[]>} Lista de todos los usuarios activos en la base de datos
     * Este método consulta la base de datos para obtener todos los usuarios cuyo estado es 'ACTIVE'
     * y los ordena por su ID en orden ascendente.
     */
    console.log('Fetching all users from the database');

    const users = await this.userRepository.find({
      where: { status: UserStatus.ACTIVE }, // Buscar los usuarios activos
      order: { id: 'ASC' }, // Se ordenan por id ascendente
    });

    return users.map((user) => this.mapToResponseDto(user));
  }

  async search(searchUserDto: SearchUserDto): Promise<UserResponseDto[]> {
    /**
     *
     * Busca usuarios en la base de datos aplicando diferentes filtros
     * Tambien se pueden combinar estos para hacer busquedas mas especificas
     *
     * @param {SearchUserDto} searchUserDto Objeto con los filtros de busqueda
     * @returns {Promise<UserResponseDto[]>} Lista de usuarios que cumplen los filtros
     */
    console.log('Searching users with criteria:', searchUserDto);

    const whereConditions: Record<string, any> = {};

    // Filtrar por nombre si se proporciona
    if (searchUserDto.name) {
      whereConditions.name = Like(`%${searchUserDto.name}%`);
    }

    // Filtrar por correo si se proporciona
    if (searchUserDto.email) {
      whereConditions.email = Like(`%${searchUserDto.email}%`);
    }

    // Filtrar por teléfono si se proporciona
    if (searchUserDto.phone) {
      whereConditions.phone = searchUserDto.phone;
    }
    // Filtrar por rol si se proporciona
    if (searchUserDto.role) {
      whereConditions.role = searchUserDto.role;
    }
    // Filtrar por estado si se proporciona
    if (searchUserDto.status) {
      whereConditions.status = searchUserDto.status;
    }
    const users = await this.userRepository.find({
      where: whereConditions,
      order: { id: 'DESC' },
    });

    return users.map((user) => this.mapToResponseDto(user));
  }

  async findOne(id: number): Promise<UserResponseDto> {
    /**
     * Busca un usuario por su ID en la base de datos.
     *
     * @param {number} id - ID del usuario a buscar
     * @returns {Promise<UserResponseDto>} El usuario encontrado con el ID especificado
     * @throws {BadRequestException} Si el ID no es un número válido
     * @throws {NotFoundException} Si no se encuentra un usuario con el ID especificado
     */
    console.log(`Searching for user with id ${id}`);

    if (isNaN(id)) {
      throw new BadRequestException('ID has to be a number');
    }

    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found.`);
    }

    return this.mapToResponseDto(user);
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    /**
     * Crea un nuevo usuario después de validar que el email sea único.
     * El usuario se crea siempre como activo (status = ACTIVE).
     *
     * @param {CreateUserDto} createUserDto - Datos validados del nuevo usuario
     * @returns {Promise<UserResponseDto>} El usuario recién creado con ID asignado
     * @throws {ConflictException} Si ya existe un usuario con ese email
     */
    console.log(`Creating new user in the DB`, createUserDto);

    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(
        `Already exists a user with email ${createUserDto.email}`,
      );
    }

    const user = this.userRepository.create({
      name: createUserDto.name.trim(),
      email: createUserDto.email.toLowerCase().trim(),
      phone: createUserDto.phone,
      password: createUserDto.password,
      avatar:
        'https://ui-avatars.com/api/?name=' +
        encodeURIComponent(createUserDto.name),
      online: false,
      age: createUserDto.age,
      role: createUserDto.role as UserRole,
      status: UserStatus.PENDING,
    });

    const savedUser = await this.userRepository.save(user);
    console.log('User created sucssefully in the DB', savedUser);

    return this.mapToResponseDto(savedUser);
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    /**
     * Actualiza los datos de un usuario existente.
     * Permite actualizar todos los campos excepto el ID.
     *
     * @param {number} id - ID del usuario a actualizar
     * @param {UpdateUserDto} updateUserDto - Datos validados para la actualización
     * @returns {Promise<UserResponseDto>} El usuario actualizado
     * @throws {BadRequestException} Si el ID no es un número válido
     * @throws {NotFoundException} Si no se encuentra un usuario con el ID especificado
     */

    console.log(`Updating user with id ${id}`, updateUserDto);

    if (isNaN(id)) {
      throw new BadRequestException('ID has to be a number');
    }

    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found.`);
    }

    if (updateUserDto.name) user.name = updateUserDto.name.trim();
    if (updateUserDto.email)
      user.email = updateUserDto.email.toLowerCase().trim();
    if (updateUserDto.password) user.password = updateUserDto.password;
    if (updateUserDto.phone) user.phone = updateUserDto.phone;
    if (updateUserDto.online) user.online = updateUserDto.online;
    if (updateUserDto.avatar !== undefined) user.avatar = updateUserDto.avatar;
    if (updateUserDto.age) user.age = updateUserDto.age;
    if (updateUserDto.role) user.role = updateUserDto.role as UserRole;
    if (updateUserDto.status) user.status = updateUserDto.status as UserStatus;

    const updateUser = await this.userRepository.save(user);
    console.log(`User with id ${id} updated successfully`, updateUser);

    return this.mapToResponseDto(updateUser);
  }

  async remove(id: number): Promise<UserResponseDto> {
    /**
     * Marca un usuario como eliminado (status = DELETED) en lugar de eliminarlo físicamente.
     *
     * @param {number} id - ID del usuario a eliminar
     * @returns {Promise<UserResponseDto>} El usuario marcado como eliminado
     * @throws {BadRequestException} Si el ID no es un número válido
     * @throws {NotFoundException} Si no se encuentra un usuario con el ID especificado
     * @throws {ConflictException} Si el usuario ya está marcado como eliminado
     */
    console.log(`Deleting user with id ${id}`);

    if (isNaN(id)) {
      throw new BadRequestException('ID has to be a number');
    }

    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found.`);
    }

    if (user.status === UserStatus.DELETED) {
      throw new ConflictException(`User with id ${id} is already deleted.`);
    }

    user.status = UserStatus.DELETED;
    const deletedUser = await this.userRepository.save(user);

    console.log(`User with id ${id} marked as deleted`, deletedUser);
    return this.mapToResponseDto(deletedUser);
  }

  private mapToResponseDto(user: UserEntity): UserResponseDto {
    /**
     * Mapea una entidad de usuario a un DTO de respuesta.
     * Excluye campos sensibles como la contraseña.
     * @param {UserEntity} user - Entidad de usuario a mapear
     * @returns {UserResponseDto} DTO de respuesta con los datos del usuario
     */
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      online: user.online,
      avatar: user.avatar,
      age: user.age,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
