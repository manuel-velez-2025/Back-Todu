import { Request, Response } from 'express';
import { TaskService } from '../../application/taskService';

function handleError(res: Response, error: any, defaultMensaje: string) {
  if (error.name === 'ZodError') {
    res.status(400).json({ mensaje: 'Datos inválidos', errores: error.issues || error.errors });
    return;
  }
  if (error.statusCode) {
    res.status(error.statusCode).json({ mensaje: error.message });
    return;
  }
  console.error(defaultMensaje, error);
  res.status(500).json({ mensaje: defaultMensaje });
}

export function createTaskController(taskService: TaskService) {
  return {
    crearTarea: async (req: Request, res: Response) => {
      try {
        const tarea = await taskService.createTask(req.user!.id, req.body);
        res.status(201).json({ mensaje: 'Tarea creada', tarea });
      } catch (err: any) {
        handleError(res, err, 'Error al crear tarea');
      }
    },

    misTareas: async (req: Request, res: Response) => {
      try {
        const tareas = await taskService.getUserTasks(req.user!.id);
        res.status(200).json({ tareas });
      } catch (err: any) {
        handleError(res, err, 'Error al listar tareas');
      }
    },

    obtenerTareaPorId: async (req: Request, res: Response) => {
      try {
        const tarea = await taskService.getTaskById(req.params.id);
        res.status(200).json({ tarea });
      } catch (err: any) {
        handleError(res, err, 'Error al obtener tarea');
      }
    },

    actualizarTarea: async (req: Request, res: Response) => {
      try {
        const tarea = await taskService.updateTask(req.params.id, req.user!.id, req.body);
        res.status(200).json({ mensaje: 'Tarea actualizada', tarea });
      } catch (err: any) {
        handleError(res, err, 'Error al actualizar tarea');
      }
    },

    borrarTarea: async (req: Request, res: Response) => {
      try {
        await taskService.deleteTask(req.params.id, req.user!.id);
        res.status(200).json({ mensaje: 'Tarea eliminada' });
      } catch (err: any) {
        handleError(res, err, 'Error al eliminar tarea');
      }
    },

    completarTarea: async (req: Request, res: Response) => {
      try {
        const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
        const tarea = await taskService.completeTask(req.params.id, req.user!.id, token);
        res.status(200).json({ mensaje: 'Tarea completada — XP sumado correctamente', tarea });
      } catch (err: any) {
        handleError(res, err, 'Error al completar tarea');
      }
    },

    reporteEvidencias: async (req: Request, res: Response) => {
      try {
        const reporte = await taskService.getReporteEvidencias(req.user!.id);
        res.status(200).json({ reporte });
      } catch (err: any) {
        handleError(res, err, 'Error al generar reporte de evidencias');
      }
    },

    suscribirPush: async (req: Request, res: Response) => {
      try {
        const result = await taskService.suscribirPush(req.user!.id, req.body);
        res.status(201).json(result);
      } catch (err: any) {
        handleError(res, err, 'Error al registrar la suscripcion push');
      }
    },

    desuscribirPush: async (req: Request, res: Response) => {
      try {
        const result = await taskService.desuscribirPush(req.user!.id, req.body);
        res.status(200).json(result);
      } catch (err: any) {
        handleError(res, err, 'Error al eliminar la suscripcion push');
      }
    },

    subirEvidencia: async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          res.status(400).json({ mensaje: 'Debes subir un archivo de imagen en el campo "evidencia"' });
          return;
        }
        const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
        const result = await taskService.submitEvidence(req.params.id, req.user!.id, req.file, token);
        res.status(200).json({
          mensaje: result.validacion.approved
            ? 'Evidencia validada correctamente'
            : 'La evidencia no corresponde a la tarea',
          ...result,
        });
      } catch (err: any) {
        handleError(res, err, 'Error al subir evidencia');
      }
    },
  };
}
