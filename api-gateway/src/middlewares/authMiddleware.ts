import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Token no proporcionado',
      mensaje: 'Se requiere un token JWT en el header Authorization: Bearer <token>',
    });
    return;
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as {
      sub: string;
      email: string;
    };
    req.user = { id: payload.sub, email: payload.email };

    req.headers['x-user-id'] = payload.sub;
    req.headers['x-user-email'] = payload.email;
    next();
  } catch {
    res.status(401).json({
      error: 'Token invalido',
      mensaje: 'El token JWT proporcionado no es valido o ha expirado',
    });
  }
}
