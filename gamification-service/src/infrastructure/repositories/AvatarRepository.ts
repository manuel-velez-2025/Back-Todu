import { pool } from '../db/pool';
import { AvatarEstado } from '../../domain/Progreso';

function toAvatar(row: any): AvatarEstado {
  return {
    usuarioId: row.usuario_id,
    expression: row.expression,
    accessory: row.accessory,
    updatedAt: row.updated_at,
  };
}

export class AvatarRepository {
  async getEstado(usuarioId: string): Promise<AvatarEstado> {
    const { rows } = await pool.query('SELECT * FROM avatar_estado WHERE usuario_id = $1', [usuarioId]);
    if (!rows[0]) {
    
      return { usuarioId, expression: 'Smiling', accessory: 'None', updatedAt: new Date() };
    }
    return toAvatar(rows[0]);
  }

  async upsertEstado(
    usuarioId: string,
    data: { expression?: string; accessory?: string },
  ): Promise<AvatarEstado> {
    const actual = await this.getEstado(usuarioId);
    const expression = data.expression ?? actual.expression;
    const accessory = data.accessory ?? actual.accessory;

    const { rows } = await pool.query(
      `INSERT INTO avatar_estado (usuario_id, expression, accessory)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id) DO UPDATE
         SET expression = $2, accessory = $3, updated_at = now()
       RETURNING *`,
      [usuarioId, expression, accessory],
    );
    return toAvatar(rows[0]);
  }
}
