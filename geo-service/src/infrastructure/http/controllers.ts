import { Request, Response } from 'express';
import { GeoService } from '../../application/geoService';

export function createGeoController(service: GeoService) {
  return {
    cercanos: async (req: Request, res: Response) => {
      try {
        const result = await service.buscarCercanos(req.query);
        res.status(200).json(result);
      } catch (err: any) {
        if (err.name === 'ZodError') {
          res.status(400).json({ mensaje: 'Datos inválidos', errores: err.issues || err.errors });
          return;
        }
        if (err.statusCode) {
          res.status(err.statusCode).json({ mensaje: err.message });
          return;
        }
        console.error('Error al buscar lugares cercanos:', err);
        res.status(500).json({ mensaje: 'Error al buscar lugares cercanos' });
      }
    },
  };
}
