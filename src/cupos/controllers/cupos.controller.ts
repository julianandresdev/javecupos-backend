import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Put,
  Request,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { CuposService } from '../services/cupos.service';
import { CupoResponseDto } from '../dto/cupo-response.dto';
import { SearchCupoDto } from '../dto/search-cupo.dto';
import { CreateCupoDto } from '../dto/create-cupo.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/interfaces/user.interface';
import { UpdateCupoDto } from '../dto/update-cupo.dto';

@Controller('cupos')
export class CuposController {
  constructor(private readonly cuposService: CuposService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  async create(
    @Body() createCupoDto: CreateCupoDto,
    @Request() req,
  ): Promise<CupoResponseDto> {
    /**
     * Crea un nuevo cupo asociado al usuario autenticado.
     * @param createCupoDto - Datos necesarios para crear el cupo.
     * @param req - Objeto de la solicitud que contiene la información del usuario autenticado.
     * @returns El cupo creado.
     */
    return this.cuposService.create(createCupoDto, req.user.id);
  }

  @Get()
  async findAll(@Query() searchCupoDto: SearchCupoDto): Promise<CupoResponseDto[]> {
    /**
     * Obtiene una lista de cupos basados en los criterios de búsqueda proporcionados.
     * @param searchDto - Parámetros de búsqueda para filtrar los cupos.
     * @returns Una lista de cupos que coinciden con los criterios de búsqueda.
     */
    return this.cuposService.findAll(searchCupoDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CupoResponseDto> {
    /**
     * Obtiene un cupo específico por su ID.
     * @param id - Identificador único del cupo.
     * @returns El cupo correspondiente al ID proporcionado.
     */
    return this.cuposService.findOne(+id);
  }

  @Get('my-cupos')
  @UseGuards(JwtAuthGuard)
  async findMyCupos(@Request() req): Promise<CupoResponseDto[]> {
    /**
     * Obtiene una lista de cupos asociados al conductor autenticado.
     * @param req - Objeto de la solicitud que contiene la información del conductor autenticado.
     * @returns Una lista de cupos del conductor autenticado.
     */
    return this.cuposService.findByDriver(req.user.id);
  }

  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelCupo(
    /**
     * Cancela un cupo específico asociado al conductor autenticado.
     * @param id - Identificador único del cupo a cancelar.
     * @param req - Objeto de la solicitud que contiene la información del conductor autenticado.
     * @returns El cupo cancelado.
     */
    @Param('id') id: string,
    @Request() req,
  ): Promise<CupoResponseDto> {
    return this.cuposService.cancelCupo(+id, req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateCupoDto: UpdateCupoDto,
  ): Promise<CupoResponseDto> {
    /**
     * Actualiza un cupo existente.
     * @param id - Identificador único del cupo a actualizar.
     * @param updateCupoDto - Datos para actualizar el cupo.
     * @returns El cupo actualizado.
     */
    return this.cuposService.update(+id, updateCupoDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string): Promise<{ message: string}> {
    /**
     * Elimina un cupo específico.
     * @param id - Identificador único del cupo a eliminar.
     * @returns Mensaje de confirmación de eliminación.
     */
    return this.cuposService.delete(+id);
  }
}
