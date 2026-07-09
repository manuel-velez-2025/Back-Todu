import { Request, Response } from 'express';
import axios from 'axios';

export function proxyTo(baseUrl: string) {
  return async (req: Request, res: Response) => {
    try {
      const targetUrl = `${baseUrl}${req.originalUrl}`;
      const contentType = req.headers['content-type'] || '';
      const isMultipart = contentType.includes('multipart/form-data');

      const response = await axios({
        method: req.method as any,
        url: targetUrl,
        data: isMultipart ? req : req.body,
        headers: {
          'Content-Type': contentType || 'application/json',
          ...(req.headers['authorization']
            ? { authorization: req.headers['authorization'] as string }
            : {}),
          ...(req.headers['x-user-id'] ? { 'x-user-id': req.headers['x-user-id'] as string } : {}),
          ...(req.headers['x-user-email']
            ? { 'x-user-email': req.headers['x-user-email'] as string }
            : {}),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: () => true,
      });

      res.status(response.status).json(response.data);
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
        res.status(503).json({
          error: 'Servicio no disponible',
          mensaje: `No se pudo conectar con ${baseUrl}. ¿El servicio está corriendo y la URL/env var es correcta?`,
        });
        return;
      }
      console.error(`Error en proxy hacia ${baseUrl}:`, error.message);
      res.status(500).json({ error: 'Error interno del gateway', mensaje: error.message });
    }
  };
}
