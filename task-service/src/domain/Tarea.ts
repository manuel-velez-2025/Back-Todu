export interface LugarTarea {
  nombre: string;
  direccion?: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface Tarea {
  id: string;
  usuarioId: string;
  titulo: string;
  descripcion: string | null;
  xpValor: number;
  dificultad: 'easy' | 'medium' | 'hard';
  tipo: 'normal' | 'fija';
  estado: 'pending' | 'completed' | 'rejected' | 'vencida';
  urlEvidencia: string | null;
  proofStatus: string | null;
  proofReason: string | null;
  proofConfidence: string | null;
  fechaCreacion: Date;
  fechaVencimiento: Date | null;
  lugar: LugarTarea | null;
}

export interface CreateTaskDTO {
  titulo: string;
  descripcion?: string;
  xpValor: number;
  dificultad?: 'easy' | 'medium' | 'hard';
  tipo?: 'normal' | 'fija';
  fechaVencimiento?: string;
  lugar?: LugarTarea;
}

export type TaskDifficulty = 'easy' | 'medium' | 'hard';