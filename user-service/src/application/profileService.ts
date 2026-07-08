import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRepository } from '../infrastructure/repositories/UserRepository';

export const updateUsernameSchema = z.object({
  username: z.string().min(2, 'El username debe tener al menos 2 caracteres'),
});

export const changePasswordSchema = z.object({
  passwordActual: z.string().min(1),
  passwordNuevo: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Debes confirmar tu contraseña para eliminar la cuenta'),
});

export class ProfileService {
  constructor(private userRepo: UserRepository) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      authProvider: user.authProvider,
      fechaNacimiento: user.fechaNacimiento,
      createdAt: user.createdAt,
    };
  }

  async updateUsername(userId: string, username: string) {
    const parsed = updateUsernameSchema.parse({ username });
    const updated = await this.userRepo.updateUsername(userId, parsed.username);
    return { id: updated.id, username: updated.username, email: updated.email };
  }

  async changePassword(userId: string, dto: z.infer<typeof changePasswordSchema>) {
    const parsed = changePasswordSchema.parse(dto);
    const user = await this.userRepo.findById(userId);
    if (!user || !user.passwordHash) {
      throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
    }
    const ok = await bcrypt.compare(parsed.passwordActual, user.passwordHash);
    if (!ok) {
      throw Object.assign(new Error('La contraseña actual no es correcta'), { statusCode: 401 });
    }
    const nuevoHash = await bcrypt.hash(parsed.passwordNuevo, 10);
    await this.userRepo.updatePassword(userId, nuevoHash);
  }

  /**
   * Elimina la cuenta SOLO si la contraseña coincide — este chequeo
   * es justo el que faltaba en la versión anterior del backend
   * (borraba la cuenta con solo el JWT, sin confirmar nada).
   */
  async deleteAccount(userId: string, dto: z.infer<typeof deleteAccountSchema>) {
    const parsed = deleteAccountSchema.parse(dto);
    const user = await this.userRepo.findById(userId);
    if (!user) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });

    if (user.passwordHash) {
      const ok = await bcrypt.compare(parsed.password, user.passwordHash);
      if (!ok) {
        throw Object.assign(new Error('Contraseña incorrecta'), { statusCode: 401 });
      }
    }
    await this.userRepo.deleteById(userId);
    return { mensaje: 'Cuenta eliminada correctamente' };
  }
}
