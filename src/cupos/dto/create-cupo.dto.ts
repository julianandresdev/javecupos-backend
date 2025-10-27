import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsDate,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CupoBarrios } from '../enum/cupo-barrios.enum';

export class CreateCupoDto {
  @IsString({ message: 'El destino debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El destino es obligatorio' })
  @IsEnum(CupoBarrios, {
    message: 'El destino debe ser uno de los barrios válidos',
  })
  destino: CupoBarrios;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  descripcion?: string;

  @IsNumber({}, { message: 'Los asientos totales deben ser un número' })
  @Min(1, { message: 'Los asientos totales deben ser mínimo 1' })
  @Max(8, { message: 'Los asientos totales no pueden exceder 8' })
  asientosTotales: number;

  @IsNumber({}, { message: 'Los asientos disponibles deben ser un número' })
  @Min(0, { message: 'Los asientos disponibles no pueden ser negativos' })
  asientosDisponibles: number;

  @Type(() => Date)
  @IsDate({ message: 'La hora de salida debe ser una fecha válida' })
  horaSalida: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'La hora de llegada estimada debe ser una fecha válida' })
  horaLlegadaEstimada?: Date;

  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  precio: number;

  @IsString({ message: 'El punto de encuentro debe ser una cadena de texto' })
  puntoEncuentro: string;

  @IsOptional()
  @IsString({ message: 'El teléfono de contacto debe ser una cadena de texto' })
  telefonoContacto?: string;

  // El conductorId se obtendrá del JWT, no del DTO
  @IsOptional()
  conductorId?: number;
}
