import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { checkLevel } from '../middlewares/checkLevel';
import { proxyTo } from '../middlewares/proxy';

const router = Router();
const GEO_SERVICE_URL = process.env.GEO_SERVICE_URL || 'http://geo-service:3005';

// Nivel requerido bajado de 2 a 1 (ver conversación con el equipo:
// "sencillo pero no regalado" — nivel 1 = 100 XP, alcanzable en un
// día normal de uso).
router.use(authMiddleware);
router.use(checkLevel(1));
router.use(proxyTo(GEO_SERVICE_URL));

export default router;
