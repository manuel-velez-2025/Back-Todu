import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const GAMIFICATION_SERVICE_URL =
  process.env.GAMIFICATION_SERVICE_URL || 'http://gamification-service:3003';

export function checkLevel(requiredLevel: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({
        error: 'Usuario no autenticado',
        mensaje: 'checkLevel requiere authMiddleware antes de ejecutarse',
      });
      return;
    }

    try {
      const response = await axios.get(`${GAMIFICATION_SERVICE_URL}/xp/progreso/${userId}`, {
        timeout: 3000,
      });

      const nivelActual: number = response.data?.nivel ?? 0;

      if (nivelActual < requiredLevel) {
        res.status(403).json({
          error: 'Nivel insuficiente',
          mensaje: `Se requiere nivel ${requiredLevel} para acceder a este recurso. Tu nivel actual es ${nivelActual}.`,
          nivelRequerido: requiredLevel,
          nivelActual,
        });
        return;
      }

      next();
    } catch (error: any) {
      console.error(`[checkLevel] Error al consultar nivel de ${userId}:`, error.message);
      res.status(503).json({
        error: 'Servicio de gamificación no disponible',
        mensaje: 'No se pudo verificar tu nivel en este momento. Intenta más tarde.',
      });
    }
  };
}
