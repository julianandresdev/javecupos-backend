import { IsInt, IsNotEmpty, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateRatingDto {
  @IsInt()
  @IsNotEmpty()
  bookingId: number;

  @IsInt()
  @Min(1)
  @Max(5)
  puntuacion: number;

  @IsString()
  @IsOptional()
  comentario?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  puntualidad?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  conduccion?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  vehiculo?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  trato?: number;
}
