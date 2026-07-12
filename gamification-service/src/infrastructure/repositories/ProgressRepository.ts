import { pool } from '../db/pool';
import { calcularNivel, xpParaNivel, Progreso } from '../../domain/Progreso';

function toProgreso(row: any): Progreso {
  const nivel = calcularNivel(row.xp_total);
  const xpSiguienteNivel = xpParaNivel(nivel);
  const xpNivelActualBase = xpParaNivel(nivel - 1) || 0;
  const rango = xpSiguienteNivel - xpNivelActualBase || 1;
  const avance = row.xp_total - xpNivelActualBase;
  return {
    usuarioId: row.usuario_id,
    xpTotal: row.xp_total,
    xpDisponible: row.xp_disponible ?? 0,
    nivel,
    rachaActual: row.racha_actual,
    tareasCompletadas: row.tareas_completadas,
    xpSiguienteNivel,
    progresoPorcentaje: Math.max(0, Math.min(100, Math.round((avance / rango) * 100))),
  };
}

export class ProgressRepository {
  async getProgreso(usuarioId: string): Promise<Progreso> {
    const { rows } = await pool.query('SELECT * FROM progreso WHERE usuario_id = $1', [usuarioId]);
    if (!rows[0]) {
      return toProgreso({
        usuario_id: usuarioId,
        xp_total: 0,
        xp_disponible: 0,
        racha_actual: 0,
        tareas_completadas: 0,
      });
    }
    return toProgreso(rows[0]);
  }

  async sumarXpAtomico(
    usuarioId: string,
    xp: number,
  ): Promise<{ xpTotal: number; subioDeNivel: boolean; xpGanado: number }> {
    const { rows } = await pool.query(
      `CALL sumar_xp_atomico($1, $2, NULL, false, NULL)`,
      [usuarioId, xp],
    );
    return {
      xpTotal: rows[0].p_xp_total,
      subioDeNivel: rows[0].p_subio_de_nivel,
      xpGanado: rows[0].p_xp_ganado ?? xp,
    };
  }
  async gastarXp(usuarioId: string, monto: number): Promise<{ xpDisponible: number }> {
    try {
      const { rows } = await pool.query(
        `CALL gastar_xp_atomico($1, $2, NULL)`,
        [usuarioId, monto],
      );
      return { xpDisponible: rows[0].p_xp_disponible };
    } catch (err: any) {
      throw mapErrorEconomia(err);
    }
  }
  async acreditarXp(usuarioId: string, monto: number): Promise<{ xpDisponible: number }> {
    const { rows } = await pool.query(
      `CALL acreditar_xp_disponible($1, $2, NULL)`,
      [usuarioId, monto],
    );
    return { xpDisponible: rows[0].p_xp_disponible };
  }
}

export function mapErrorEconomia(err: any): Error {
  const msg: string = err?.message || '';
  if (msg.includes('SALDO_INSUFICIENTE')) {
    return Object.assign(new Error('No tienes XP suficiente para esta operación'), {
      statusCode: 409,
    });
  }
  if (msg.includes('SIN_PROGRESO')) {
    return Object.assign(new Error('El usuario aún no tiene progreso registrado'), {
      statusCode: 404,
    });
  }
  if (msg.includes('MONTO_INVALIDO')) {
    return Object.assign(new Error('El monto debe ser un entero positivo'), {
      statusCode: 400,
    });
  }
  return err;
}