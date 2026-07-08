import { Request, Response } from 'express';
import { AuthService } from '../../application/authService';
import { ProfileService } from '../../application/profileService';
import { InventoryService } from '../../application/inventoryService';
import { TrialService } from '../../application/trialService';

function handleError(res: Response, error: any, defaultMensaje: string) {
  if (error.name === 'ZodError') {
    res.status(400).json({ mensaje: 'Datos invalidos', errores: error.issues || error.errors });
    return;
  }
  if (error.statusCode) {
    res.status(error.statusCode).json({ mensaje: error.message });
    return;
  }
  console.error(defaultMensaje, error);
  res.status(500).json({ mensaje: defaultMensaje });
}

export function createAuthController(authService: AuthService) {
  return {
    register: async (req: Request, res: Response) => {
      try {
        const result = await authService.registerWithEmail(req.body);
        res.status(201).json(result);
      } catch (err: any) {
        handleError(res, err, 'Error al registrar usuario');
      }
    },

    login: async (req: Request, res: Response) => {
      try {
        const result = await authService.loginWithEmail(req.body);
        res.status(200).json(result);
      } catch (err: any) {
        handleError(res, err, 'Error al iniciar sesion');
      }
    },

    googleAuth: async (req: Request, res: Response) => {
      try {
        const result = await authService.googleAuth(req.body);
        res.status(200).json(result);
      } catch (err: any) {
        handleError(res, err, 'Error al autenticar con Google');
      }
    },
  };
}

export function createProfileController(profileService: ProfileService) {
  return {
    getProfile: async (req: Request, res: Response) => {
      try {
        const profile = await profileService.getProfile(req.user!.id);
        res.status(200).json(profile);
      } catch (err: any) {
        handleError(res, err, 'Error al obtener perfil');
      }
    },

    updateUsername: async (req: Request, res: Response) => {
      try {
        const user = await profileService.updateUsername(req.user!.id, req.body?.username);
        res.status(200).json({ mensaje: 'Username actualizado correctamente', user });
      } catch (err: any) {
        handleError(res, err, 'Error al actualizar username');
      }
    },

    changePassword: async (req: Request, res: Response) => {
      try {
        await profileService.changePassword(req.user!.id, req.body);
        res.status(200).json({ mensaje: 'Contrasena actualizada correctamente' });
      } catch (err: any) {
        handleError(res, err, 'Error al cambiar contrasena');
      }
    },

    deleteAccount: async (req: Request, res: Response) => {
      try {
        const result = await profileService.deleteAccount(req.user!.id, req.body);
        res.status(200).json(result);
      } catch (err: any) {
        handleError(res, err, 'Error al eliminar cuenta');
      }
    },
  };
}

export function createInventoryController(inventoryService: InventoryService) {
  return {
    getInventario: async (req: Request, res: Response) => {
      try {
        const result = await inventoryService.getInventario(req.user!.id);
        res.status(200).json(result);
      } catch (err: any) {
        handleError(res, err, 'Error al obtener inventario');
      }
    },

    agregar: async (req: Request, res: Response) => {
      try {
        const item = await inventoryService.agregar(req.user!.id, req.body);
        res.status(201).json({ mensaje: 'Item agregado al inventario', item });
      } catch (err: any) {
        handleError(res, err, 'Error al agregar item');
      }
    },

    equipar: async (req: Request, res: Response) => {
      try {
        const item = await inventoryService.equipar(req.user!.id, req.body);
        res.status(200).json({ mensaje: 'Item equipado exitosamente', item });
      } catch (err: any) {
        handleError(res, err, 'Error al equipar item');
      }
    },

    desequipar: async (req: Request, res: Response) => {
      try {
        await inventoryService.desequipar(req.user!.id, req.body);
        res.status(200).json({ mensaje: 'Item desequipado exitosamente' });
      } catch (err: any) {
        handleError(res, err, 'Error al desequipar item');
      }
    },
  };
}

export function createTrialController(trialService: TrialService) {
  return {
    getTrialStatus: async (req: Request, res: Response) => {
      try {
        const status = await trialService.getTrialStatus(req.user!.id);
        res.status(200).json(status);
      } catch (err: any) {
        handleError(res, err, 'Error al obtener estado de prueba');
      }
    },
  };
}
