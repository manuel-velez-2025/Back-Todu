import { pool } from '../db/pool';
import { PartidaFarkle } from '../../domain/Progreso';
import { mapErrorEconomia } from './ProgressRepository';

function toPartida(row: any): PartidaFarkle {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    apuesta: row.apuesta,
    estado: row.estado,
    premio: row.premio,
    createdAt: row.created_at,
    resueltaAt: row.resuelta_at,
  };
}

export class FarkleRepository {
  async apostar(
    usuarioId: string,
    apuesta: number,
  ): Promise<{ partida: PartidaFarkle; xpDisponible: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const gasto = await client.query(
        `CALL gastar_xp_atomico($1, $2, NULL)`,
        [usuarioId, apuesta],
      );

      const insert = await client.query(
        `INSERT INTO partidas_farkle (usuario_id, apuesta)
         VALUES ($1, $2)
         RETURNING id, usuario_id, apuesta, estado, premio, created_at, resuelta_at`,
        [usuarioId, apuesta],
      );

      await client.query('COMMIT');
      return {
        partida: toPartida(insert.rows[0]),
        xpDisponible: gasto.rows[0].p_xp_disponible,
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err?.code === '23505') {
        throw Object.assign(
          new Error('Ya tienes una partida en curso. Termínala antes de apostar de nuevo.'),
          { statusCode: 409 },
        );
      }
      throw mapErrorEconomia(err);
    } finally {
      client.release();
    }
  }
  async resolver(
    usuarioId: string,
    partidaId: string,
    gano: boolean,
  ): Promise<{ partida: PartidaFarkle; xpDisponible: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const update = await client.query(
        `UPDATE partidas_farkle
         SET estado = $3,
             resuelta_at = now()
         WHERE id = $1 AND usuario_id = $2 AND estado = 'en_curso'
         RETURNING id, usuario_id, apuesta, estado, premio, created_at, resuelta_at`,
        [partidaId, usuarioId, gano ? 'ganada' : 'perdida'],
      );

      if (update.rowCount === 0) {
        await client.query('ROLLBACK');
        throw Object.assign(
          new Error('No existe una partida en curso con ese id para este usuario'),
          { statusCode: 404 },
        );
      }

      let partida = toPartida(update.rows[0]);
      let xpDisponible: number;

      if (gano) {
        const premioReal = partida.apuesta * 2;
        const acredito = await client.query(
          `CALL acreditar_xp_disponible($1, $2, NULL)`,
          [usuarioId, premioReal],
        );
        await client.query(
          `UPDATE partidas_farkle SET premio = $2 WHERE id = $1`,
          [partidaId, premioReal],
        );
        partida = { ...partida, premio: premioReal };
        xpDisponible = acredito.rows[0].p_xp_disponible;
      } else {
        const saldo = await client.query(
          `SELECT xp_disponible FROM progreso WHERE usuario_id = $1`,
          [usuarioId],
        );
        xpDisponible = saldo.rows[0]?.xp_disponible ?? 0;
      }

      await client.query('COMMIT');
      return { partida, xpDisponible };
    } catch (err: any) {
      if (!err.statusCode) {
        await client.query('ROLLBACK').catch(() => {});
      }
      throw mapErrorEconomia(err);
    } finally {
      client.release();
    }
  }

  async partidaEnCurso(usuarioId: string): Promise<PartidaFarkle | null> {
    const { rows } = await pool.query(
      `SELECT id, usuario_id, apuesta, estado, premio, created_at, resuelta_at
       FROM partidas_farkle
       WHERE usuario_id = $1 AND estado = 'en_curso'
       LIMIT 1`,
      [usuarioId],
    );
    return rows[0] ? toPartida(rows[0]) : null;
  }
}