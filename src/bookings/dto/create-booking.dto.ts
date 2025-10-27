import { IsNumber, Min } from 'class-validator';

export class CreateBookingDto {
  @IsNumber()
  cupoId: number;

  @IsNumber()
  @Min(1)
  asientosReservados: number;
}
