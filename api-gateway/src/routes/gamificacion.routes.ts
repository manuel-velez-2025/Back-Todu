import { Router } from 'express';
import { proxyTo } from '../middlewares/proxy';

const router = Router();
const GAMIFICATION_SERVICE_URL =
  process.env.GAMIFICATION_SERVICE_URL || 'http://gamification-service:3003';

router.use(proxyTo(GAMIFICATION_SERVICE_URL));

export default router;
