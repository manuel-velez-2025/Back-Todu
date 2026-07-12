import express from 'express';
import cors from 'cors';
import { ProgressRepository } from './infrastructure/repositories/ProgressRepository';
import { AvatarRepository } from './infrastructure/repositories/AvatarRepository';
import { GamificationRepository } from './infrastructure/repositories/GamificationRepository';
import { AvatarService } from './application/avatarService';
import { GamificationService } from './application/gamificationService';
import { createGamificationController, createAvatarController, createFarkleController } from './infrastructure/http/controllers';
import { authMiddleware } from './infrastructure/http/authMiddleware';
import { FarkleRepository } from './infrastructure/repositories/FarkleRepository';
import { FarkleService } from './application/farkleService';

const app = express();
app.use(cors());
app.use(express.json());

const progressRepo = new ProgressRepository();
const avatarRepo = new AvatarRepository();
const gamificationRepo = new GamificationRepository();
const avatarService = new AvatarService(avatarRepo);
const gamificationService = new GamificationService(progressRepo, avatarService, gamificationRepo);

const gamificationController = createGamificationController(gamificationService);
const farkleRepo = new FarkleRepository();
const farkleService = new FarkleService(farkleRepo, avatarService);
const farkleController = createFarkleController(farkleService);
const avatarController = createAvatarController(avatarService);

app.post('/xp/atomic', authMiddleware, gamificationController.addXpAtomic);
app.post('/xp/gastar', authMiddleware, gamificationController.gastarXp);
app.get('/xp/progreso/:userId', gamificationController.getProgreso);
app.post('/juegos/farkle/apostar', authMiddleware, farkleController.apostar);
app.post('/juegos/farkle/resolver', authMiddleware, farkleController.resolver);
app.get('/juegos/farkle/activa', authMiddleware, farkleController.activa);
app.get('/gamificacion/progreso/:userId', authMiddleware, gamificationController.getProgreso);

app.post('/gamification/xp/award', authMiddleware, gamificationController.awardXp);

app.get('/gamification/robot/:userId', authMiddleware, gamificationController.getRobotStatus);

app.post('/robot/evento', authMiddleware, avatarController.procesarEvento);
app.get('/robot/estado/:userId', authMiddleware, avatarController.getEstado);
app.get('/robot', authMiddleware, avatarController.getAvatar);
app.put('/robot', authMiddleware, avatarController.updateAvatar);

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'gamification-service' }));

const PORT = Number(process.env.PORT) || 3003;
app.listen(PORT, () => {
  console.log(`gamification-service corriendo en puerto ${PORT}`);
});
