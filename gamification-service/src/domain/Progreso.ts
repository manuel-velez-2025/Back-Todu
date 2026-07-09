export interface Progreso {
  usuarioId: string;
  xpTotal: number;
  nivel: number;
  rachaActual: number;
  tareasCompletadas: number;
  xpSiguienteNivel: number;
  progresoPorcentaje: number;
}

export interface AvatarEstado {
  usuarioId: string;
  expression: 'Smiling' | 'Happy' | 'Sad' | 'Scared' | 'Surprised';
  accessory: 'Easter' | 'Halloween' | 'Christmas' | 'None';
  updatedAt: Date;
}

export const EXPRESIONES_VALIDAS = ['Smiling', 'Happy', 'Sad', 'Scared', 'Surprised'] as const;
export const ACCESORIOS_VALIDOS = ['Easter', 'Halloween', 'Christmas', 'None'] as const;

export function calcularNivel(xp: number): number {
  return Math.floor(Math.sqrt(xp) / 10);
}

export function xpParaNivel(nivel: number): number {
  return Math.pow((nivel + 1) * 10, 2);
}
