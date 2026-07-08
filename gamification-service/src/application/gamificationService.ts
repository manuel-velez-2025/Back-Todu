import { z } from 'zod';
import { ProgressRepository } from '../infrastructure/repositories/ProgressRepository';
import { AvatarService } from './avatarService';
import { GamificationRepository } from '../infrastructure/repositories/GamificationRepository';

export const addXpSchema = z.object({
  userId: z.string().uuid('userId debe ser un UUID válido'),
  xp: z.number().int().positive('xp debe ser un número positivo'),
  evento: z.string().optional(),
});

const DIFICULTAD_MULTIPLICADOR: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export const awardXpSchema = z.object({
  userId: z.string().uuid('userId debe ser un UUID válido'),
  xp: z.number().int().positive('xp debe ser un número positivo'),
  evento: z.string().optional(),
});

export const taskCompletionSchema = z.object({
  userId: z.string().uuid('userId debe ser un UUID válido'),
  taskDifficulty: z.enum(['easy', 'medium', 'hard']),
  evento: z.string().optional(),
});

const XP_BASE = 50;

export class GamificationService {
  constructor(
    private progressRepo: ProgressRepository,
    private avatarService: AvatarService,
    private gamificationRepo: GamificationRepository,
  ) {}

  async getProgreso(userId: string) {
    return this.progressRepo.getProgreso(userId);
  }

  async getRobotStatus(userId: string) {
    return this.gamificationRepo.getRobotStatus(userId);
  }

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

  async processTaskCompletion(dto: unknown) {
    const parsed = taskCompletionSchema.parse(dto);
    const multiplicador = DIFICULTAD_MULTIPLICADOR[parsed.taskDifficulty] || 1;
    const xpToAward = XP_BASE * multiplicador;

    const resultado = await this.gamificationRepo.addXp(parsed.userId, xpToAward);
    const status = await this.gamificationRepo.getRobotStatus(parsed.userId);

    const evento = resultado.subioDeNivel ? 'LEVEL_UP' : parsed.evento || 'TASK_COMPLETED';
    await this.avatarService.reaccionarAEvento(parsed.userId, evento);

    return {
      userId: parsed.userId,
      xpGanado: xpToAward,
      xpTotal: resultado.xpTotal,
      nivel: status.nivel,
      fase: status.fase,
      subioDeNivel: resultado.subioDeNivel,
      rachaActual: status.rachaActual,
      tareasCompletadas: status.tareasCompletadas,
    };
  }
}
