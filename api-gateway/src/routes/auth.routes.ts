import { Router } from 'express';
import { proxyTo } from '../middlewares/proxy';

const router = Router();
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';

router.use(proxyTo(USER_SERVICE_URL));

export default router;
