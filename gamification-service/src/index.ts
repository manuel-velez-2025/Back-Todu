import express from 'express';
import cors from 'cors';
import { ProgressRepository } from './infrastructure/repositories/ProgressRepository';
import { AvatarRepository } from './infrastructure/repositories/AvatarRepository';
import { AvatarService } from './application/avatarService';
import { GamificationService } from './application/gamificationService';
import { createGamificationController, createAvatarController } from './infrastructure/http/controllers';
import { authMiddleware } from './infrastructure/http/authMiddleware';

const app = express();
app.use(cors());
app.use(express.json());

const progressRepo = new ProgressRepository();
const avatarRepo = new AvatarRepository();
const avatarService = new AvatarService(avatarRepo);
const gamificationService = new GamificationService(progressRepo, avatarService);

const gamificationController = createGamificationController(gamificationService);
const avatarController = createAvatarController(avatarService);

// --- XP / progreso ---
app.post('/xp/atomic', authMiddleware, gamificationController.addXpAtomic);
app.get('/xp/progreso/:userId', gamificationController.getProgreso); // sin auth, según la doc de la API
app.get('/gamificacion/progreso/:userId', authMiddleware, gamificationController.getProgreso); // alias legacy

// --- Robot / avatar (antes robot-service, ahora mismo proceso) ---
app.post('/robot/evento', authMiddleware, avatarController.procesarEvento);
app.get('/robot/estado/:userId', authMiddleware, avatarController.getEstado);
app.get('/robot', authMiddleware, avatarController.getAvatar);
app.put('/robot', authMiddleware, avatarController.updateAvatar);

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'gamification-service' }));

const PORT = Number(process.env.PORT) || 3003;
app.listen(PORT, () => {
  console.log(`gamification-service corriendo en puerto ${PORT}`);
});
