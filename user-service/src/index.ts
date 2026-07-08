import express from 'express';
import cors from 'cors';
import { UserRepository } from './infrastructure/repositories/UserRepository';
import { GoogleAuthAdapter } from './infrastructure/auth/GoogleAuthAdapter';
import { BcryptAdapter } from './infrastructure/auth/BcryptAdapter';
import { AuthService } from './application/authService';
import { ProfileService } from './application/profileService';
import { InventoryService } from './application/inventoryService';
import { TrialService } from './application/trialService';
import {
  createAuthController,
  createProfileController,
  createInventoryController,
  createTrialController,
} from './infrastructure/http/controllers';
import { authMiddleware } from './infrastructure/http/authMiddleware';

const app = express();
app.use(cors());
app.use(express.json());

const userRepo = new UserRepository();
const hashProvider = new BcryptAdapter();
const googleAuthAdapter = new GoogleAuthAdapter();
const authService = new AuthService(userRepo, hashProvider, googleAuthAdapter);
const profileService = new ProfileService(userRepo);
const inventoryService = new InventoryService(userRepo);
const trialService = new TrialService(userRepo);

const authController = createAuthController(authService);
const profileController = createProfileController(profileService);
const inventoryController = createInventoryController(inventoryService);
const trialController = createTrialController(trialService);

app.post('/auth/register', authController.register);
app.post('/auth/login', authController.login);
app.post('/auth/google', authController.googleAuth);

app.get('/perfil', authMiddleware, profileController.getProfile);
app.put('/perfil/username', authMiddleware, profileController.updateUsername);
app.put('/perfil/password', authMiddleware, profileController.changePassword);
app.delete('/perfil', authMiddleware, profileController.deleteAccount);

app.get('/inventario', authMiddleware, inventoryController.getInventario);
app.post('/inventario/agregar', authMiddleware, inventoryController.agregar);
app.post('/inventario/equipar', authMiddleware, inventoryController.equipar);
app.post('/inventario/desequipar', authMiddleware, inventoryController.desequipar);

app.get('/users/me/trial', authMiddleware, trialController.getTrialStatus);

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'user-service' }));

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`user-service corriendo en puerto ${PORT}`);
});
