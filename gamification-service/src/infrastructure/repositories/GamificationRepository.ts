import { pool } from '../db/pool';
import { calcularNivel } from '../../domain/Progreso';
import type { AddXpResult, RobotStatus, IGamificationRepository } from '../../domain/interfaces/IGamificationRepository';

export class GamificationRepository implements IGamificationRepository {
  async addXp(usuarioId: string, xpToAdd: number): Promise<AddXpResult> {
    await pool.query(
      `CALL sumar_xp_atomico($1, $2)`,
      [usuarioId, xpToAdd],
    );

    const { rows } = await pool.query(
      'SELECT xp_total FROM progreso WHERE usuario_id = $1',
      [usuarioId],
    );

    const xpTotal = rows[0]?.xp_total ?? 0;
    const subioDeNivel = xpTotal > 0 && xpTotal - xpToAdd >= 0
      ? calcularNivel(xpTotal) > calcularNivel(xpTotal - xpToAdd)
      : false;

    return { xpTotal, subioDeNivel };
  }

  async getRobotStatus(usuarioId: string): Promise<RobotStatus> {
    const { rows } = await pool.query(
      `SELECT
         usuario_id,
         xp_total,
         calcular_nivel(xp_total) AS nivel,
         racha_actual,
         tareas_completadas
       FROM progreso
       WHERE usuario_id = $1`,
      [usuarioId],
    );

    if (!rows[0]) {
      return {
        usuarioId,
        xpTotal: 0,
        nivel: 0,
        fase: 'huevo',
        rachaActual: 0,
        tareasCompletadas: 0,
      };
    }

    const row = rows[0];
    const nivel = Number(row.nivel);
    let fase: RobotStatus['fase'];
    if (nivel < 3) {
      fase = 'huevo';
    } else if (nivel < 7) {
      fase = 'cria';
    } else {
      fase = 'adulto';
    }

    return {
      usuarioId: row.usuario_id,
      xpTotal: row.xp_total,
      nivel,
      fase,
      rachaActual: row.racha_actual,
      tareasCompletadas: row.tareas_completadas,
    };
  }
}
