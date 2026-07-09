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
      return toProgreso({ usuario_id: usuarioId, xp_total: 0, racha_actual: 0, tareas_completadas: 0 });
    }
    return toProgreso(rows[0]);
  }

  async sumarXpAtomico(usuarioId: string, xp: number): Promise<{ xpTotal: number; subioDeNivel: boolean }> {
    const { rows } = await pool.query(
      `CALL sumar_xp_atomico($1, $2, NULL, false)`,
      [usuarioId, xp],
    );
    return {
      xpTotal: rows[0].p_xp_total,
      subioDeNivel: rows[0].p_subio_de_nivel,
    };
  }
}
