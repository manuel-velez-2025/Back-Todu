import { pool } from '../db/pool';

export class PushRepository {
  async suscribir(usuarioId: string, endpoint: string, p256dh: string, auth: string): Promise<void> {
    await pool.query(
      `INSERT INTO push_subscripciones (usuario_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (usuario_id, endpoint) DO UPDATE SET p256dh = $3, auth = $4`,
      [usuarioId, endpoint, p256dh, auth],
    );
  }

  async desuscribir(usuarioId: string, endpoint: string): Promise<void> {
    await pool.query(
      `DELETE FROM push_subscripciones WHERE usuario_id = $1 AND endpoint = $2`,
      [usuarioId, endpoint],
    );
  }
}