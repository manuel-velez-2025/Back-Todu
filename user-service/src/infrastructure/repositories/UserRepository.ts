import { pool } from '../db/pool';
import { User, InventoryItem } from '../../domain/User';

function rowToUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    authProvider: row.auth_provider,
    googleId: row.google_id,
    fechaNacimiento:
      row.fecha_nacimiento instanceof Date
        ? row.fecha_nacimiento.toISOString().slice(0, 10)
        : row.fecha_nacimiento,
    createdAt: row.created_at,
  };
}

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async findByEmailConPassword(email: string): Promise<User | null> {
    const { rows } = await pool.query(
      'SELECT id, username, email, password_hash, auth_provider, google_id, fecha_nacimiento, created_at FROM usuarios WHERE email = $1',
      [email],
    );
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async registrarConCorreo(data: {
    username: string;
    email: string;
    passwordHash: string;
    fechaNacimiento: string;
  }): Promise<User> {
    return this.crearConProcedimiento(data);
  }

  async crearConProcedimiento(data: {
    username: string;
    email: string;
    passwordHash: string;
    fechaNacimiento: string;
  }): Promise<User> {
    try {
      const { rows } = await pool.query(
        `CALL registrar_usuario($1, $2, $3, $4, NULL)`,
        [data.username, data.email, data.passwordHash, data.fechaNacimiento],
      );

      const usuarioId = rows[0]?.p_usuario_id;
      const creado = await this.findById(usuarioId);
      if (!creado) throw new Error('No se pudo leer el usuario recién creado');
      return creado;
    } catch (err: any) {
      if (err.code === 'P0001') {
        throw Object.assign(new Error(err.message.replace(/^.*?:\s*/, '')), { statusCode: 400 });
      }
      if (err.code === '23505') {
        throw Object.assign(new Error('El email o username ya está registrado'), {
          statusCode: 409,
        });
      }
      throw err;
    }
  }

  async updateUsername(id: string, username: string): Promise<User> {
    const { rows } = await pool.query(
      'UPDATE usuarios SET username = $1 WHERE id = $2 RETURNING *',
      [username, id],
    );
    if (!rows[0]) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
    return rowToUser(rows[0]);
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE google_id = $1', [googleId]);
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async crearConGoogle(data: {
    username: string;
    email: string;
    googleId: string;
  }): Promise<User> {
    try {
      const { rows } = await pool.query(
        `INSERT INTO usuarios (username, email, auth_provider, google_id, fecha_nacimiento)
         VALUES ($1, $2, 'google', $3, '2000-01-01')
         RETURNING *`,
        [data.username, data.email, data.googleId],
      );
      return rowToUser(rows[0]);
    } catch (err: any) {
      if (err.code === '23505') {
        throw Object.assign(new Error('El email o username ya está registrado'), {
          statusCode: 409,
        });
      }
      throw err;
    }
  }

  async getTrialStatus(userId: string): Promise<{ diasRestantes: number } | null> {
    const { rows } = await pool.query(
      `SELECT dias_restantes_prueba(created_at) AS dias_restantes
       FROM usuarios WHERE id = $1`,
      [userId],
    );
    if (!rows[0]) return null;
    return { diasRestantes: Number(rows[0].dias_restantes) };
  }

  async deleteById(id: string): Promise<void> {
    await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
  }

  async getInventario(usuarioId: string): Promise<InventoryItem[]> {
    const { rows } = await pool.query(
      `SELECT item_row_id, usuario_id, item_id, is_equipped, created_at
       FROM vista_inventario_usuario
       WHERE usuario_id = $1 AND item_id IS NOT NULL
       ORDER BY created_at`,
      [usuarioId],
    );
    return rows.map((r) => ({
      id: r.item_row_id,
      usuarioId: r.usuario_id,
      itemId: r.item_id,
      isEquipped: r.is_equipped,
      createdAt: r.created_at,
    }));
  }

  async agregarItem(usuarioId: string, itemId: string): Promise<InventoryItem> {
    try {
      const { rows } = await pool.query(
        `INSERT INTO inventario (usuario_id, item_id, is_equipped)
         VALUES ($1, $2, false) RETURNING *`,
        [usuarioId, itemId],
      );
      const r = rows[0];
      return { id: r.id, usuarioId: r.usuario_id, itemId: r.item_id, isEquipped: r.is_equipped, createdAt: r.created_at };
    } catch (err: any) {
      if (err.code === '23505') {
        throw Object.assign(new Error('El item ya está en tu inventario'), { statusCode: 409 });
      }
      throw err;
    }
  }

  async equiparItem(usuarioId: string, itemId: string): Promise<InventoryItem> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE inventario SET is_equipped = false WHERE usuario_id = $1', [usuarioId]);
      const { rows } = await client.query(
        `UPDATE inventario SET is_equipped = true WHERE usuario_id = $1 AND item_id = $2 RETURNING *`,
        [usuarioId, itemId],
      );
      if (!rows[0]) {
        throw Object.assign(new Error('No tienes ese item en tu inventario'), { statusCode: 404 });
      }
      await client.query('COMMIT');
      const r = rows[0];
      return { id: r.id, usuarioId: r.usuario_id, itemId: r.item_id, isEquipped: r.is_equipped, createdAt: r.created_at };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async desequiparItem(usuarioId: string, itemId: string): Promise<void> {
    await pool.query(
      'UPDATE inventario SET is_equipped = false WHERE usuario_id = $1 AND item_id = $2',
      [usuarioId, itemId],
    );
  }
}
