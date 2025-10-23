import { Injectable } from '@nestjs/common';
import { Cupo } from '../interface/cupos.interface';
import { CreateCupoDto } from '../dto/cupos.dto';

@Injectable()
export class CuposService {
  private cupos: Cupo[] = [];
  private nextId = 1;

  create(createCupoDto: CreateCupoDto): Cupo {
    const now = new Date();
    const nuevoCupo: Cupo = {
      id: this.nextId++,
      ...createCupoDto,
      fechaCreacion: now,
      estado: 'activo',
    };
    this.cupos.push(nuevoCupo);
    return nuevoCupo;
  }

  findAll(): Cupo[] {
    return this.cupos.filter(c => c.estado === 'activo');
  }
}
