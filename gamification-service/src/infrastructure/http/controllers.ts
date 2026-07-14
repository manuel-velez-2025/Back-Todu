import { Request, Response } from 'express';
import { GamificationService } from '../../application/gamificationService';
import { AvatarService } from '../../application/avatarService';
import { FarkleService, MemoramaService } from '../../application/farkleService';

function handleError(res: Response, error: any, defaultMensaje: string) {
  if (error.name === 'ZodError') {
    res.status(400).json({ mensaje: 'Datos invalidos', errores: error.issues || error.errors });
    return;
  }
  if (error.statusCode) {
    res.status(error.statusCode).json({ mensaje: error.message });
    return;
  }
  console.error(defaultMensaje, error);
  res.status(500).json({ mensaje: defaultMensaje });
}

export function createGamificationController(service: GamificationService) {
  return {
    addXpAtomic: async (req: Request, res: Response) => {
      try {
        const result = await service.addXpAtomic(req.body);
        res.status(200).json(result);
      } catch (err: any) {
        handleError(res, err, 'Error al sumar XP');
      }
    },

    getProgreso: async (req: Request, res: Response) => {
      try {
        const progreso = await service.getProgreso(req.params.userId);
        res.status(200).json({
          userId: progreso.usuarioId,
          xpActual: progreso.xpTotal,
          xpDisponible: progreso.xpDisponible,
          xpSiguienteNivel: progreso.xpSiguienteNivel,
          nivel: progreso.nivel,
          rachaActual: progreso.rachaActual,
          tareasCompletadas: progreso.tareasCompletadas,
          progresoPorcentaje: progreso.progresoPorcentaje,
        });
          
      } catch (err: any) {
        handleError(res, err, 'Error al obtener progreso');
      }
    },
    
    gastarXp: async (req: Request, res: Response) => {
      try {
        const result = await service.gastarXp(req.user!.id, req.body);
        res.status(200).json(result);
      } catch (err: any) {
        handleError(res, err, 'Error al gastar XP');
      }
    },

    awardXp: async (req: Request, res: Response) => {
      try {
        const result = await service.processTaskCompletion(req.body);
        res.status(200).json(result);
      } catch (err: any) {
        handleError(res, err, 'Error al otorgar XP por tarea completada');
      }
    },

    getRobotStatus: async (req: Request, res: Response) => {
      try {
        const status = await service.getRobotStatus(req.params.userId);
        res.status(200).json(status);
      } catch (err: any) {
        handleError(res, err, 'Error al obtener estado del robot');
      }
    },
  };
}

export function createFarkleController(service: FarkleService) {
  return {
    apostar: async (req: Request, res: Response) => {
      try {
        const result = await service.apostar(req.user!.id, req.body);
        res.status(201).json(result);
      } catch (err: any) {
        handleError(res, err, 'Error al registrar la apuesta');
      }
    },

    resolver: async (req: Request, res: Response) => {
      try {
        const result = await service.resolver(req.user!.id, req.body);
        res.status(200).json(result);
      } catch (err: any) {
        handleError(res, err, 'Error al resolver la partida');
      }
    },

    activa: async (req: Request, res: Response) => {
      try {
        const result = await service.partidaActiva(req.user!.id);
        res.status(200).json(result);
      } catch (err: any) {
        handleError(res, err, 'Error al consultar la partida activa');
      }
    },
  };
}

export function createAvatarController(service: AvatarService) {
  return {
    getEstado: async (req: Request, res: Response) => {
      try {
        const estado = await service.getEstado(req.params.userId || req.user!.id);
        res.status(200).json({
          id: estado.usuarioId,
          userId: estado.usuarioId,
          emocion: estado.expression.toLowerCase(),
          expression: estado.expression,
          accessory: estado.accessory,
        });
      } catch (err: any) {
        handleError(res, err, 'Error al obtener estado del robot');
      }
    },

    getAvatar: async (req: Request, res: Response) => {
      try {
        const estado = await service.getEstado(req.user!.id);
        res.status(200).json({
          userId: estado.usuarioId,
          expression: estado.expression,
          accessory: estado.accessory,
          updatedAt: estado.updatedAt,
        });
      } catch (err: any) {
        handleError(res, err, 'Error al obtener avatar');
      }
    },

    updateAvatar: async (req: Request, res: Response) => {
      try {
        const estado = await service.updateEstado(req.user!.id, req.body);
        res.status(200).json({
          userId: estado.usuarioId,
          expression: estado.expression,
          accessory: estado.accessory,
          updatedAt: estado.updatedAt,
        });
      } catch (err: any) {
        handleError(res, err, 'Error al actualizar avatar');
      }
    },

    procesarEvento: async (req: Request, res: Response) => {
      try {
        const { userId, event } = req.body;
        if (!userId || !event) {
          res.status(400).json({ mensaje: 'Se requiere userId y event' });
          return;
        }
        const emotion = await service.reaccionarAEvento(userId, event);
        res.status(200).json({ userId, emotion, event, timestamp: new Date().toISOString() });
      } catch (err: any) {
        handleError(res, err, 'Error al procesar evento del robot');
      }
    },
  };
}
export function createMemoramaController(service: MemoramaService) {
  return {
    reclamarVictoria: async (req: Request, res: Response) => {
      try {
        const result = await service.reclamarVictoria(req.user!.id);
        res.status(200).json(result);
      } catch (err: any) {
        handleError(res, err, 'Error al reclamar la recompensa del memorama');
      }
    },
  };
}