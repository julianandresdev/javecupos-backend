import { IsNumber, IsString, IsDate, IsOptional } from 'class-validator';
// Si usas Swagger:
// import { ApiProperty } from '@nestjs/swagger';

export class CreateCupoDto {
  // @ApiProperty() //<- si usas swagger, descomenta
  @IsNumber()
  capacidad: number;

  @IsNumber()
  disponible: number;

  @IsString()
  tipo: string;
}
