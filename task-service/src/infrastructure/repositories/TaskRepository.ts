import { pool } from '../db/pool';
import { Tarea, CreateTaskDTO } from '../../domain/Tarea';


function isoDiaDeHoy(): number {
  const dow = new Date().getDay();
  return dow === 0 ? 7 : dow; 
}

function rowToTarea(row: any): Tarea {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    xpValor: row.xp_valor,
    dificultad: row.dificultad ?? 'easy',
    tipo: row.tipo ?? 'normal',
    diasSemana: row.dias_semana ?? null,
    horaRecordatorio: row.hora_recordatorio ?? null,
    aplicaHoy: row.tipo !== 'fija' || !row.dias_semana || row.dias_semana.includes(isoDiaDeHoy()),
    estado: row.estado,
    urlEvidencia: row.url_evidencia,
    proofStatus: row.proof_status,
    proofReason: row.proof_reason,
    proofConfidence: row.proof_confidence,
    fechaCreacion: row.fecha_creacion,
    fechaVencimiento: row.fecha_vencimiento ?? null,
    lugar: row.lugar_nombre
      ? {
          nombre: row.lugar_nombre,
          direccion: row.lugar_direccion,
          placeId: row.place_id,
          lat: row.lugar_lat,
          lng: row.lugar_lng,
        }
      : null,
  };
}

export class TaskRepository {
  async create(usuarioId: string, data: CreateTaskDTO): Promise<Tarea> {
    const { rows } = await pool.query(
      `INSERT INTO tareas (usuario_id, titulo, descripcion, xp_valor, dificultad, tipo, dias_semana, hora_recordatorio, estado, fecha_vencimiento,
                           lugar_nombre, lugar_direccion, place_id, lugar_lat, lugar_lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        usuarioId, data.titulo, data.descripcion ?? null, data.xpValor,
        data.dificultad ?? 'easy', data.tipo ?? 'normal',
        data.diasSemana ?? null, data.horaRecordatorio ?? null,
        data.fechaVencimiento ?? null,
        data.lugar?.nombre ?? null, data.lugar?.direccion ?? null,
        data.lugar?.placeId ?? null, data.lugar?.lat ?? null, data.lugar?.lng ?? null,
      ],
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
         dificultad = COALESCE($5, dificultad),
         fecha_vencimiento = COALESCE($6, fecha_vencimiento)
       WHERE id = $1 RETURNING *`,
      [id, data.titulo ?? null, data.descripcion ?? null, data.xpValor ?? null, data.dificultad ?? null, data.fechaVencimiento ?? null],
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

  async marcarTareasVencidas(): Promise<{ usuarioId: string; cantidad: number }[]> {
    const { rows } = await pool.query(
      `UPDATE tareas
       SET estado = 'vencida'
       WHERE estado = 'pending'
         AND tipo = 'normal'
         AND fecha_vencimiento IS NOT NULL
         AND fecha_vencimiento < NOW()
       RETURNING usuario_id`,
    );
    const porUsuario = new Map<string, number>();
    for (const r of rows) {
      porUsuario.set(r.usuario_id, (porUsuario.get(r.usuario_id) ?? 0) + 1);
    }
    return Array.from(porUsuario, ([usuarioId, cantidad]) => ({ usuarioId, cantidad }));
  }

  async contarFijasPendientesPorUsuario(): Promise<{ usuarioId: string; cantidad: number }[]> {
    const { rows } = await pool.query(
      `SELECT usuario_id, COUNT(*)::int AS cantidad
       FROM tareas
       WHERE tipo = 'fija' AND estado = 'pending'
         AND (dias_semana IS NULL OR
              (EXTRACT(ISODOW FROM NOW() - INTERVAL '1 day'))::int = ANY(dias_semana))
       GROUP BY usuario_id`,
    );
    return rows.map((r) => ({ usuarioId: r.usuario_id, cantidad: r.cantidad }));
  }

  async reiniciarFijas(): Promise<number> {
    const { rowCount } = await pool.query(
      `UPDATE tareas
       SET estado = 'pending',
           url_evidencia = NULL,
           proof_status = NULL,
           proof_reason = NULL,
           proof_confidence = NULL
       WHERE tipo = 'fija' AND estado <> 'pending'`,
    );
    return rowCount ?? 0;
  }

   async registrarHistorialFijas(): Promise<number> {
    const { rowCount } = await pool.query(
      `INSERT INTO historial_fijas_diario (tarea_id, usuario_id, titulo, fecha, estado_final)
       SELECT id, usuario_id, titulo, CURRENT_DATE,
         CASE estado
           WHEN 'completed' THEN 'completada'
           WHEN 'rejected' THEN 'rechazada'
           ELSE 'no_completada'
         END
       FROM tareas
       WHERE tipo = 'fija'
       ON CONFLICT (tarea_id, fecha) DO NOTHING`,
    );
    return rowCount ?? 0;
  }

  async getHistorialFijas(usuarioId: string) {
    const { rows } = await pool.query(
      `SELECT tarea_id, titulo, fecha, estado_final
       FROM historial_fijas_diario
       WHERE usuario_id = $1
       ORDER BY fecha DESC, titulo`,
      [usuarioId],
    );
    return rows.map((r) => ({
      tareaId: r.tarea_id,
      titulo: r.titulo,
      fecha: r.fecha,
      estadoFinal: r.estado_final,
    }));
  }

  async findPorVencerEn(minutos: number): Promise<{ id: string; usuarioId: string; titulo: string }[]> {
    const { rows } = await pool.query(
      `SELECT id, usuario_id, titulo FROM tareas
       WHERE estado = 'pending'
         AND tipo = 'normal'
         AND fecha_vencimiento IS NOT NULL
         AND fecha_vencimiento BETWEEN NOW() AND NOW() + ($1 || ' minutes')::INTERVAL
         AND NOT EXISTS (
           SELECT 1 FROM notificaciones_enviadas n
           WHERE n.tarea_id = tareas.id AND n.tipo = 'por_vencer'
         )`,
      [minutos],
    );
    return rows.map((r) => ({ id: r.id, usuarioId: r.usuario_id, titulo: r.titulo }));
  }

  async findFijasParaRecordar(): Promise<{ id: string; usuarioId: string; titulo: string }[]> {
    const { rows } = await pool.query(
      `SELECT id, usuario_id, titulo FROM tareas
       WHERE tipo = 'fija' AND estado = 'pending'
         AND hora_recordatorio IS NOT NULL
         AND hora_recordatorio BETWEEN (NOW()::time) AND (NOW()::time + INTERVAL '1 minute')
         AND (dias_semana IS NULL OR (EXTRACT(ISODOW FROM NOW()))::int = ANY(dias_semana))
         AND NOT EXISTS (
           SELECT 1 FROM recordatorios_enviados r
           WHERE r.tarea_id = tareas.id AND r.fecha = CURRENT_DATE
         )`,
    );
    return rows.map((r) => ({ id: r.id, usuarioId: r.usuario_id, titulo: r.titulo }));
  }

  async marcarRecordatorioEnviado(tareaId: string): Promise<void> {
    await pool.query(
      `INSERT INTO recordatorios_enviados (tarea_id, fecha) VALUES ($1, CURRENT_DATE)
       ON CONFLICT DO NOTHING`,
      [tareaId],
    );
  }

  async marcarNotificada(tareaId: string, tipo: string): Promise<void> {
    await pool.query(
      `INSERT INTO notificaciones_enviadas (tarea_id, tipo) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [tareaId, tipo],
    );
  }

  async getReporteEvidencias(usuarioId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM vista_tareas_con_evidencia WHERE usuario_id = $1 ORDER BY ultimo_intento_fecha DESC`,
      [usuarioId],
    );
    return rows;
  }
}