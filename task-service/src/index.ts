import express from 'express';
import cors from 'cors';
import { TaskRepository } from './infrastructure/repositories/TaskRepository';
import { ClaudeVisionAdapter } from './infrastructure/external/claudeVisionAdapter';
import { CloudinaryAdapter } from './infrastructure/external/CloudinaryAdapter';
import { TaskService } from './application/taskService';
import { createTaskController } from './infrastructure/http/controllers';
import { authMiddleware } from './infrastructure/http/authMiddleware';
import { uploadMiddleware } from './infrastructure/http/upload';
import { iniciarCronTareasVencidas } from './infrastructure/cron/TaskCron';
import { GamificationClient } from './infrastructure/http/GamificationClient';
import { PushRepository } from './infrastructure/repositories/PushRepository';

const app = express();
app.use(cors());
app.use(express.json());

const repo = new TaskRepository();
const vision = new ClaudeVisionAdapter();
const storageProvider = new CloudinaryAdapter();
const gamificationClient = new GamificationClient();
const pushRepo = new PushRepository();
const taskService = new TaskService(repo, vision, storageProvider, gamificationClient, pushRepo);
const controller = createTaskController(taskService);

const router = express.Router();
router.post('/', authMiddleware, controller.crearTarea);
router.get('/mis-tareas', authMiddleware, controller.misTareas);
router.get('/reporte/evidencias', authMiddleware, controller.reporteEvidencias);
router.get('/:id', authMiddleware, controller.obtenerTareaPorId);
router.put('/:id', authMiddleware, controller.actualizarTarea);
router.delete('/:id', authMiddleware, controller.borrarTarea);
router.patch('/:id/complete', authMiddleware, controller.completarTarea);
router.post('/notificaciones/suscribir', authMiddleware, controller.suscribirPush);
router.delete('/notificaciones/suscribir', authMiddleware, controller.desuscribirPush);
router.post('/:id/evidencia', authMiddleware, (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      res.status(400).json({ mensaje: err.message });
      return;
    }
    next();
  });
}, controller.subirEvidencia);

app.use('/tareas', router);

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'task-service' }));

iniciarCronTareasVencidas(taskService);

const PORT = Number(process.env.PORT) || 3002;
app.listen(PORT, () => {
  console.log(`task-service corriendo en puerto ${PORT}`);
});
