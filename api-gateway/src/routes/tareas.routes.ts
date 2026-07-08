import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { proxyTo } from '../middlewares/proxy';

const router = Router();
const TASK_SERVICE_URL = process.env.TASK_SERVICE_URL || 'http://task-service:3002';

router.use(authMiddleware);
router.use(proxyTo(TASK_SERVICE_URL));

export default router;
