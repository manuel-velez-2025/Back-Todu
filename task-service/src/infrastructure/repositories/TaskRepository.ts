import { pool } from '../db/pool';
import { Tarea, CreateTaskDTO } from '../../domain/Tarea';

function rowToTarea(row: any): Tarea {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    xpValor: row.xp_valor,
    estado: row.estado,
    urlEvidencia: row.url_evidencia,
    proofStatus: row.proof_status,
    proofReason: row.proof_reason,
    proofConfidence: row.proof_confidence,
    fechaCreacion: row.fecha_creacion,
    fechaVencimiento: row.fecha_vencimiento ?? null,
  };
}

export class TaskRepository {
  async create(usuarioId: string, data: CreateTaskDTO): Promise<Tarea> {
    const { rows } = await pool.query(
      `INSERT INTO tareas (usuario_id, titulo, descripcion, xp_valor, estado, fecha_vencimiento)
       VALUES ($1, $2, $3, $4, 'pending', $5) RETURNING *`,
      [usuarioId, data.titulo, data.descripcion ?? null, data.xpValor, data.fechaVencimiento ?? null],
    );
    return rowToTarea(rows[0]);
  }

  async findByUserId(usuarioId: string): Promise<Tarea[]> {
    const { rows } = await pool.query(
      'SELECT * FROM tareas WHERE usuario_id = $1 ORDER BY fecha_creacion DESC',
      [usuarioId],
    );
    return rows.map(rowToTarea);
  }

  async findById(id: string): Promise<Tarea | null> {
    const { rows } = await pool.query('SELECT * FROM tareas WHERE id = $1', [id]);
    return rows[0] ? rowToTarea(rows[0]) : null;
  }

  async update(id: string, data: Partial<CreateTaskDTO>): Promise<Tarea> {
    const { rows } = await pool.query(
      `UPDATE tareas SET
         titulo = COALESCE($2, titulo),
         descripcion = COALESCE($3, descripcion),
         xp_valor = COALESCE($4, xp_valor),
         fecha_vencimiento = COALESCE($5, fecha_vencimiento)
       WHERE id = $1 RETURNING *`,
      [id, data.titulo ?? null, data.descripcion ?? null, data.xpValor ?? null, data.fechaVencimiento ?? null],
    );
    return rowToTarea(rows[0]);
  }

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM tareas WHERE id = $1', [id]);
  }

  async markCompleted(id: string): Promise<Tarea> {
    const { rows } = await pool.query(
      `UPDATE tareas SET estado = 'completed' WHERE id = $1 RETURNING *`,
      [id],
    );
    return rowToTarea(rows[0]);
  }

  async updateEvidencia(
    id: string,
    data: { urlEvidencia: string; estado: string; proofReason: string; proofConfidence: string },
  ): Promise<Tarea> {
    const { rows } = await pool.query(
      `UPDATE tareas SET url_evidencia = $2, estado = $3, proof_status = $3,
         proof_reason = $4, proof_confidence = $5
       WHERE id = $1 RETURNING *`,
      [id, data.urlEvidencia, data.estado, data.proofReason, data.proofConfidence],
    );
    return rowToTarea(rows[0]);

  }

  async registrarIntentoEvidencia(
    tareaId: string,
    data: { urlEvidencia: string; approved: boolean; reason: string; confidence: string },
  ): Promise<void> {
    await pool.query(
      `INSERT INTO historial_evidencias (tarea_id, url_evidencia, approved, reason, confidence)
       VALUES ($1, $2, $3, $4, $5)`,
      [tareaId, data.urlEvidencia, data.approved, data.reason, data.confidence],
    );
  }

  async marcarTareasVencidas(): Promise<number> {
    const { rowCount } = await pool.query(
      `UPDATE tareas
       SET estado = 'vencida'
       WHERE estado = 'pending'
         AND fecha_vencimiento IS NOT NULL
         AND fecha_vencimiento < NOW()`,
    );
    return rowCount ?? 0;
  }
}
