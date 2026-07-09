import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { checkLevel } from '../middlewares/checkLevel';
import { proxyTo } from '../middlewares/proxy';

const router = Router();
const GEO_SERVICE_URL = process.env.GEO_SERVICE_URL || 'http://geo-service:3005';
router.use(authMiddleware);
router.use(checkLevel(1));
router.use(proxyTo(GEO_SERVICE_URL));

export default router;
