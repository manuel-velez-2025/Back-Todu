import { pool } from '../db/pool';
import { mapErrorEconomia } from './ProgressRepository';

export class TiendaRepository {
  async getCatalogo(usuarioId: string) {
    const { rows } = await pool.query(
      `SELECT c.item_id, c.nombre, c.categoria, c.precio,
              (d.id IS NOT NULL) AS comprado
       FROM catalogo_decoraciones c
       LEFT JOIN decoraciones_compradas d
         ON d.item_id = c.item_id AND d.usuario_id = $1
       WHERE c.activo = true
       ORDER BY c.categoria, c.precio`,
      [usuarioId],
    );
    return rows.map((r) => ({
      itemId: r.item_id, nombre: r.nombre, categoria: r.categoria,
      precio: r.precio, comprado: r.comprado,
    }));
  }

  async getItemCatalogo(itemId: string) {
    const { rows } = await pool.query(
      `SELECT item_id, nombre, precio FROM catalogo_decoraciones WHERE item_id = $1 AND activo = true`,
      [itemId],
    );
    return rows[0] ?? null;
  }

  async comprar(usuarioId: string, itemId: string, precio: number) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insert = await client.query(
        `INSERT INTO decoraciones_compradas (usuario_id, item_id) VALUES ($1, $2)
         ON CONFLICT (usuario_id, item_id) DO NOTHING RETURNING id`,
        [usuarioId, itemId],
      );
      if (insert.rowCount === 0) {
        await client.query('ROLLBACK');
        throw Object.assign(new Error('Ya compraste esta decoración'), { statusCode: 409 });
      }
      const gasto = await client.query(`CALL gastar_xp_atomico($1, $2, NULL)`, [usuarioId, precio]);
      await client.query('COMMIT');
      return { xpDisponible: gasto.rows[0].p_xp_disponible };
    } catch (err: any) {
      if (!err.statusCode) await client.query('ROLLBACK').catch(() => {});
      throw mapErrorEconomia(err);
    } finally {
      client.release();
    }
  }

  async getInventario(usuarioId: string) {
    const { rows } = await pool.query(
      `SELECT item_id FROM decoraciones_compradas WHERE usuario_id = $1`,
      [usuarioId],
    );
    return rows.map((r) => r.item_id);
  }
}