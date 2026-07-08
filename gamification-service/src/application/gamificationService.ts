import { z } from 'zod';
import { ProgressRepository } from '../infrastructure/repositories/ProgressRepository';
import { AvatarService } from './avatarService';

export const addXpSchema = z.object({
  userId: z.string().uuid('userId debe ser un UUID válido'),
  xp: z.number().int().positive('xp debe ser un número positivo'),
  evento: z.string().optional(), // opcional: quién llama puede o no mandar el motivo
});

export class GamificationService {
  constructor(
    private progressRepo: ProgressRepository,
    private avatarService: AvatarService,
  ) {}

  async getProgreso(userId: string) {
    return this.progressRepo.getProgreso(userId);
  }

  /**
   * Suma XP de forma atómica (vía procedimiento almacenado, ver
   * ProgressRepository) y, en el mismo proceso —sin llamada HTTP—,
   * actualiza la expresión del avatar según el evento. Antes esto
   * era una petición POST a robot-service que podía fallar por
   * red/URL/CORS; ahora es una llamada de función directa.
   */
  async addXpAtomic(dto: unknown) {
    const parsed = addXpSchema.parse(dto);
    const resultado = await this.progressRepo.sumarXpAtomico(parsed.userId, parsed.xp);
    const progreso = await this.progressRepo.getProgreso(parsed.userId);

    const evento = resultado.subioDeNivel ? 'LEVEL_UP' : parsed.evento || 'TASK_COMPLETED';
    await this.avatarService.reaccionarAEvento(parsed.userId, evento);

    return {
      userId: parsed.userId,
      xpActual: progreso.xpTotal,
      xpAgregado: parsed.xp,
      xpSiguienteNivel: progreso.xpSiguienteNivel,
      nivel: progreso.nivel,
      subioDeNivel: resultado.subioDeNivel,
      rachaActual: progreso.rachaActual,
      tareasCompletadas: progreso.tareasCompletadas,
      progresoPorcentaje: progreso.progresoPorcentaje,
    };
  }
}
