export interface Tarea {
  id: string;
  usuarioId: string;
  titulo: string;
  descripcion: string | null;
  xpValor: number;
  estado: 'pending' | 'completed' | 'rejected' | 'vencida';
  urlEvidencia: string | null;
  proofStatus: string | null;
  proofReason: string | null;
  proofConfidence: string | null;
  fechaCreacion: Date;
  fechaVencimiento: Date | null;
}

export interface CreateTaskDTO {
  titulo: string;
  descripcion?: string;
  xpValor: number;
  fechaVencimiento?: string;
}
