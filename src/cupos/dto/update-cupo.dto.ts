import { PartialType } from '@nestjs/mapped-types';
import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  IsDate,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCupoDto } from './create-cupo.dto';
import { CupoStatus } from '../enum/cupo-status.enum';
import { CupoBarrios } from '../enum/cupo-barrios.enum';
export class UpdateCupoDto extends PartialType(CreateCupoDto) {
  @IsOptional()
  @IsString()
  origen?: string;

  @IsOptional()
  @IsString()
  @IsEnum(CupoBarrios)
  destino?: CupoBarrios;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  asientosTotales?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  asientosDisponibles?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  horaSalida?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  horaLlegadaEstimada?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio?: number;

  @IsOptional()
  @IsString()
  puntoEncuentro?: string;

  @IsOptional()
  @IsString()
  telefonoContacto?: string;

  @IsOptional()
  @IsEnum(CupoStatus)
  estado?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
