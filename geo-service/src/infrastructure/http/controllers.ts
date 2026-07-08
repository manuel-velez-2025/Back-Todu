import { Request, Response } from 'express';
import { GeoService } from '../../application/geoService';
import { GamificationClient } from './GamificationClient';

const MINIMAS_FASES_PERMITIDAS: ReadonlySet<string> = new Set(['cria', 'adulto']);

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

export function createGeoController(service: GeoService, gamificationClient: GamificationClient) {
  return {
    cercanos: async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          res.status(401).json({ mensaje: 'Usuario no autenticado' });
          return;
        }

        const robotStatus = await gamificationClient.getRobotStatus(userId);

        if (!robotStatus || !MINIMAS_FASES_PERMITIDAS.has(robotStatus.fase)) {
          res.status(403).json({
            mensaje: 'Acceso restringido. Necesitas alcanzar la fase "cria" o superior para desbloquear recomendaciones de lugares.',
            faseActual: robotStatus?.fase ?? 'desconocida',
          });
          return;
        }

        const result = await service.buscarCercanos(req.query);
        res.status(200).json(result);
      } catch (err: any) {
        handleError(res, err, 'Error al buscar lugares cercanos');
      }
    },
  };
}
