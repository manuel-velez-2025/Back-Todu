export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string | null;
  authProvider: 'email' | 'google';
  googleId: string | null;
  fechaNacimiento: string; // YYYY-MM-DD
  xpTotal?: number; // no vive aquí en realidad (vive en gamification-service),
  // se deja opcional solo por compatibilidad con la forma de respuesta que
  // ya espera el frontend en /auth/register y /auth/login.
  createdAt: Date;
}

export interface InventoryItem {
  id: string;
  usuarioId: string;
  itemId: string;
  isEquipped: boolean;
  createdAt: Date;
}

export const ITEMS_VALIDOS = [
  'halloween',
  'bunny',
  'ninja',
  'robot',
  'princess',
  'pirate',
  'superhero',
  'wizard',
] as const;
