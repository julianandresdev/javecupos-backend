import { Controller, Get, Post, Body } from '@nestjs/common';
import { CuposService } from '../services/cupos.service';
import { CreateCupoDto } from '../dto/cupos.dto';
import type { Cupo } from '../interface/cupos.interface';

@Controller('cupos')
export class CuposController {
  constructor(private readonly cuposService: CuposService) {}

  @Post()
  create(@Body() createCupoDto: CreateCupoDto): Cupo {
    return this.cuposService.create(createCupoDto);
  }

  @Get()
  findAll(): Cupo[] {
    return this.cuposService.findAll();
  }
}