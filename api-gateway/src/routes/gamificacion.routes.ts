import { Router } from 'express';
import { proxyTo } from '../middlewares/proxy';

const router = Router();
const GAMIFICATION_SERVICE_URL =
  process.env.GAMIFICATION_SERVICE_URL || 'http://gamification-service:3003';

// No se aplica authMiddleware aquí a propósito: cada ruta dentro de
// gamification-service ya decide por sí misma si requiere JWT
// (por ejemplo, GET /xp/progreso/:userId es pública a propósito,
// según la documentación de la API — las demás sí lo exigen
// internamente). Esto evita duplicar esa lógica en dos capas que
// se puedan desalinear entre sí.
router.use(proxyTo(GAMIFICATION_SERVICE_URL));

export default router;
