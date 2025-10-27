import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsDate,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CupoStatus } from '../enum/cupo-status.enum';
import { CupoBarrios } from '../enum/cupo-barrios.enum';

export class SearchCupoDto {

  @IsOptional()
  @IsString()
  @IsEnum(CupoBarrios)
  destino?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fechaSalida?: Date; // Para buscar por fecha específica

  @IsOptional()
  @IsNumber()
  @Min(1)
  asientosMinimos?: number; // Mínimo de asientos necesarios

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioMaximo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioMinimo?: number;

  @IsOptional()
  @IsEnum(CupoStatus)
  estado?: string;

  @IsOptional()
  @IsNumber()
  conductorId?: number; // Para buscar cupos de un conductor específico

  // Paginación
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

