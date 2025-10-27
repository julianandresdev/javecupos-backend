import { UserRole } from "src/users/interfaces/user.interface";
import { CupoStatus } from "../enum/cupo-status.enum";
import { CupoBarrios } from "../enum/cupo-barrios.enum";

export class ConductorInfo {
  /**
   * Identificador único del conductor
   */
  id: number;
  name: string;
  phone?: number;
  email?: string;
  role: UserRole;
}

export class CupoResponseDto {
  /**
   * Identificador único del cupo
   */
  id: number;
  conductorId: number;
  conductor?: ConductorInfo;
  destino: CupoBarrios;
  descripcion?: string;
  asientosTotales: number;
  asientosDisponibles: number;
  horaSalida: Date;
  precio: number;
  estado: CupoStatus;
  activo: boolean;
  puntoEncuentro: string;
  telefonoContacto?: string;
  createdAt: Date;
  updatedAt: Date;
  tiempoParaSalida?: string;
}
