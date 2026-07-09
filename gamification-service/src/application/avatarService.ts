import { z } from 'zod';
import { AvatarRepository } from '../infrastructure/repositories/AvatarRepository';
import { EXPRESIONES_VALIDAS, ACCESORIOS_VALIDOS } from '../domain/Progreso';

export const updateAvatarSchema = z.object({
  expression: z.enum(EXPRESIONES_VALIDAS).optional(),
  accessory: z.enum(ACCESORIOS_VALIDOS).optional(),
});

const EVENTO_A_EMOCION: Record<string, string> = {
  TASK_COMPLETED: 'Happy',
  LEVEL_UP: 'Surprised',
  STREAK_DAY: 'Surprised',
  TASK_EXPIRED: 'Scared',
  NO_ACTIVITY: 'Sad',
};

export class AvatarService {
  constructor(private repo: AvatarRepository) {}

  async getEstado(usuarioId: string) {
    return this.repo.getEstado(usuarioId);
  }

  async updateEstado(usuarioId: string, data: unknown) {
    const parsed = updateAvatarSchema.parse(data);
    return this.repo.upsertEstado(usuarioId, parsed);
  }

  async reaccionarAEvento(usuarioId: string, evento: string): Promise<string> {
    const expresion = EVENTO_A_EMOCION[evento] || 'Smiling';
    await this.repo.upsertEstado(usuarioId, { expression: expresion });
    return expresion;
  }
}
