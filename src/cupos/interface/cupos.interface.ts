export interface Cupo {
  id: number;
  capacidad: number;
  disponible: number;
  tipo: string;
  fechaCreacion: Date;  // Campo automático
  estado?: string;
}
