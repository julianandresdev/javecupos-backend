import { UserRole } from 'src/users/interfaces/user.interface';
import { CupoStatus } from '../enum/cupo-status.enum';
import { CupoBarrios } from '../enum/cupo-barrios.enum';
export interface Conductor {
  /**
   * Identificador único del conductor
   */
  id: number;
  name: string;
  email: string;
  phone: number;
  role: UserRole;
}

export interface Cupo {
  /**
   * Identificador único del cupo
   */
  id: number; 
  conductorId: number;
  conductor?: Conductor;
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
}

export interface CupoFilters {
  /**
   * Filtros opcionales para buscar cupos
   */
  destino?: string;
  fechaSalida?: Date;
  asientosMinimos?: number;
  precioMaximo?: number;
  precioMinimo?: number;
  estado?: keyof CupoStatus;
  conductorId?: number;
}

export interface PaginatedCupos {
  /**
   * Lista de cupos paginados
   */
  cupos: Cupo[]; // Lista de cupos en la página actual
  total: number; // Total de cupos disponibles
  page: number; // Página actual
  limit: number; // Número de cupos por página
  totalPages: number; // Total de páginas disponibles
  hasNext: boolean; // Indica si hay una página siguiente
  hasPrevious: boolean; // Indica si hay una página anterior
}
