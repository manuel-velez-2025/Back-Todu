import { Request, Response } from 'express';
import { GeoService } from '../../application/geoService';

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

export function createGeoController(service: GeoService) {
  return {
    cercanos: async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          res.status(401).json({ mensaje: 'Usuario no autenticado' });
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