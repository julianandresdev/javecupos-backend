import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto, SearchUserDto, UpdateUserDto, UserResponseDto } from '../dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  /**\
   * @param userService Inyecta el servicio de usuarios para manejar la lógica de negocio
   */
  constructor(private readonly userService: UsersService) {}

  @Get()
  async getAllUsers(): Promise<UserResponseDto[]> {
    /**
     * Obtener todos los usuarios activos
     * @route GET /users
     * @return {Promise<UserResponseDto[]>} Lista de usuarios activos
     */
    return await this.userService.getAll();
  }

  @Get('search')
  async searchUsers(
    @Query() searchUserDto: SearchUserDto,
  ): Promise<UserResponseDto[]> {
    /**
     * Buscar usuarios con filtros
     * @route GET /users/search
     * @param {SearchUserDto} searchUserDto Filtros de busqueda
     * @return {Promise<UserResponseDto[]>} Lista de usuarios que cumplen los filtros
     */
    return await this.userService.search(searchUserDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    /**
     * Crear un nuevo usuario
     * @route POST /users
     * @param {CreateUserDto} createUserDto Datos del nuevo usuario
     * @return {Promise<UserResponseDto>} Usuario creado
     */
    return await this.userService.create(createUserDto);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    /**
     * Obtener un usuario por su ID
     * @route GET /users/:id
     * @param {string} id ID del usuario a buscar
     * @return {Promise<UserResponseDto>} Usuario encontrado
     */
    const userId = parseInt(id);
    return await this.userService.findOne(userId);
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    /**
     * Actualizar un usuario por su ID
     * @route PUT /users/:id
     * @param {string} id ID del usuario a actualizar
     * @param {UpdateUserDto} updateUserDto Datos a actualizar
     * @return {Promise<UserResponseDto>} Usuario actualizado
     */
    const userId = parseInt(id);
    return await this.userService.update(userId, updateUserDto);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string): Promise<{ message: string }> {
    /**
     * Eliminar un usuario por su ID
     * @route DELETE /users/:id
     * @param {string} id ID del usuario a eliminar
     * @return {Promise<{ message: string }>} Mensaje de confirmación
     */
    const userId = parseInt(id);
    const deletedUser = await this.userService.remove(userId);
    return { message: `User with id ${deletedUser.id} deleted successfully` };
  }
}
