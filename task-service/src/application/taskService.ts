import { z } from 'zod';
import { TaskRepository } from '../infrastructure/repositories/TaskRepository';
import { ClaudeVisionAdapter } from '../infrastructure/external/claudeVisionAdapter';
import { IStorageProvider } from '../domain/interfaces/IStorageProvider';
import type { IGamificationClient } from './ports/IGamificationClient';

export const createTaskSchema = z.object({
  titulo: z.string().min(1, 'El titulo es requerido'),
  descripcion: z.string().optional(),
  xpValor: z.number().int().positive('xpValor debe ser un numero positivo'),
  dificultad: z.enum(['easy', 'medium', 'hard']).optional(),
  fechaVencimiento: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export class TaskService {
  constructor(
    private repo: TaskRepository,
    private vision?: ClaudeVisionAdapter,
    private storageProvider?: IStorageProvider,
    private gamificationClient?: IGamificationClient,
  ) {}

  async createTask(usuarioId: string, data: unknown) {
    const parsed = createTaskSchema.parse(data);
    return this.repo.create(usuarioId, parsed);
  }

  async getUserTasks(usuarioId: string) {
    return this.repo.findByUserId(usuarioId);
  }

  async getTaskById(id: string) {
    const tarea = await this.repo.findById(id);
    if (!tarea) throw Object.assign(new Error('Tarea no encontrada'), { statusCode: 404 });
    return tarea;
  }

  async updateTask(id: string, usuarioId: string, data: unknown) {
    const tarea = await this.repo.findById(id);
    if (!tarea) throw Object.assign(new Error('Tarea no encontrada'), { statusCode: 404 });
    if (tarea.usuarioId !== usuarioId) {
      throw Object.assign(new Error('No tienes permiso para modificar esta tarea'), { statusCode: 403 });
    }
    const parsed = updateTaskSchema.parse(data);
    return this.repo.update(id, parsed);
  }

  async deleteTask(id: string, usuarioId: string) {
    const tarea = await this.repo.findById(id);
    if (!tarea) throw Object.assign(new Error('Tarea no encontrada'), { statusCode: 404 });
    if (tarea.usuarioId !== usuarioId) {
      throw Object.assign(new Error('No tienes permiso para modificar esta tarea'), { statusCode: 403 });
    }
    await this.repo.delete(id);
  }

  async completeTask(taskId: string, userId: string) {
    const tarea = await this.repo.findById(taskId);
    if (!tarea) throw Object.assign(new Error('Tarea no encontrada'), { statusCode: 404 });
    if (tarea.usuarioId !== userId) {
      throw Object.assign(new Error('No tienes permiso para modificar esta tarea'), { statusCode: 403 });
    }
    if (tarea.estado === 'completed') {
      throw Object.assign(new Error('La tarea ya esta completada'), { statusCode: 409 });
    }

    const result = await this.repo.markCompleted(taskId);

    if (this.gamificationClient) {
      try {
        await this.gamificationClient.awardXp({
          userId: tarea.usuarioId,
          taskDifficulty: tarea.dificultad,
          evento: 'TASK_COMPLETED',
        });
      } catch (err) {
        console.error('Error al notificar a gamification-service tras completar tarea:', err);
      }
    }

    return result;
  }

  async submitEvidence(taskId: string, userId: string, file: Express.Multer.File) {
    if (!this.vision) {
      throw new Error('ClaudeVisionAdapter no configurado');
    }
    const tarea = await this.repo.findById(taskId);
    if (!tarea) throw Object.assign(new Error('Tarea no encontrada'), { statusCode: 404 });
    if (tarea.usuarioId !== userId) {
      throw Object.assign(new Error('No tienes permiso para modificar esta tarea'), { statusCode: 403 });
    }

    const validation = await this.vision.validateEvidence(file.buffer, file.mimetype, tarea.descripcion || tarea.titulo);

    let urlEvidencia: string;
    if (this.storageProvider) {
      urlEvidencia = await this.storageProvider.upload({
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
      });
    } else {
      urlEvidencia = `/uploads/${file.filename}`;
    }

    const nuevoEstado = validation.approved ? 'completed' : 'rejected';

    await this.repo.updateEvidencia(taskId, {
      urlEvidencia,
      estado: nuevoEstado,
      proofReason: validation.reason,
      proofConfidence: validation.confidence,
    });
    await this.repo.registrarIntentoEvidencia(taskId, {
      urlEvidencia,
      approved: validation.approved,
      reason: validation.reason,
      confidence: validation.confidence,
    });

    if (validation.approved && this.gamificationClient) {
      try {
        await this.gamificationClient.awardXp({
          userId: tarea.usuarioId,
          taskDifficulty: tarea.dificultad,
          evento: 'TASK_COMPLETED',
        });
      } catch (err) {
        console.error('Error al notificar a gamification-service tras evidencia aprobada:', err);
      }
    }

    return { estado: nuevoEstado, url: urlEvidencia, validacion: validation };
  }

  async processOverdueTasks(): Promise<number> {
    const actualizadas = await this.repo.marcarTareasVencidas();
    if (actualizadas > 0) {
      console.log(`[TaskCron] ${actualizadas} tareas marcadas como vencidas`);
    }
    return actualizadas;
  }
}
