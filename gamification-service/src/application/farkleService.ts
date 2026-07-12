import { z } from 'zod';
import { FarkleRepository } from '../infrastructure/repositories/FarkleRepository';
import { AvatarService } from './avatarService';

export const apostarSchema = z.object({
  apuesta: z
    .number()
    .int('La apuesta debe ser un entero')
    .min(10, 'La apuesta mínima es 10 XP')
    .max(5000, 'La apuesta máxima es 5000 XP'),
});

export const resolverSchema = z.object({
  partidaId: z.string().uuid('partidaId debe ser un UUID válido'),
  resultado: z.enum(['ganada', 'perdida'], {
    errorMap: () => ({ message: "resultado debe ser 'ganada' o 'perdida'" }),
  }),
});

export class FarkleService {
  constructor(
    private repo: FarkleRepository,
    private avatarService: AvatarService,
  ) {}
  async apostar(usuarioId: string, dto: unknown) {
    const parsed = apostarSchema.parse(dto);
    const { partida, xpDisponible } = await this.repo.apostar(usuarioId, parsed.apuesta);
    return {
      partidaId: partida.id,
      apuesta: partida.apuesta,
      estado: partida.estado,
      xpDisponible,
      premioSiGanas: partida.apuesta * 2,
    };
  }

  async resolver(usuarioId: string, dto: unknown) {
    const parsed = resolverSchema.parse(dto);
    const gano = parsed.resultado === 'ganada';
    const { partida, xpDisponible } = await this.repo.resolver(usuarioId, parsed.partidaId, gano);

    await this.avatarService
      .reaccionarAEvento(usuarioId, gano ? 'FARKLE_WIN' : 'FARKLE_LOSE')
      .catch((err) => console.error('[Farkle] No se pudo actualizar el avatar:', err));

    return {
      partidaId: partida.id,
      estado: partida.estado,
      apuesta: partida.apuesta,
      premio: partida.premio,
      xpDisponible,
    };
  }

  async partidaActiva(usuarioId: string) {
    const partida = await this.repo.partidaEnCurso(usuarioId);
    if (!partida) {
      return { activa: false, partida: null };
    }
    return {
      activa: true,
      partida: {
        partidaId: partida.id,
        apuesta: partida.apuesta,
        estado: partida.estado,
        createdAt: partida.createdAt,
      },
    };
  }
}