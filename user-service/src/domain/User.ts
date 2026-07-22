export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string | null;
  authProvider: 'email' | 'google';
  googleId: string | null;
  fechaNacimiento: string;
  xpTotal?: number; 
  createdAt: Date;
  totpHabilitado?: boolean;
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
