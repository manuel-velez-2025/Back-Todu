import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { UserRepository } from '../infrastructure/repositories/UserRepository';
import { IAuthProvider } from '../domain/interfaces/IAuthProvider';
import { IHashProvider } from '../domain/interfaces/IHashProvider';
import { User } from '../domain/User';

export const registerSchema = z.object({
  username: z.string().min(2, 'El username debe tener al menos 2 caracteres'),
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha invalido, debe ser YYYY-MM-DD'),
});

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'La contrasena es requerida'),
});

export const googleAuthSchema = z.object({
  token: z.string().min(1, 'El token de Google es requerido'),
});

interface AuthResult {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    authProvider: string;
    googleId: string | null;
    fechaNacimiento: string;
    xpTotal: number;
    xpActual: number;
    createdAt: Date;
  };
}

function toAuthUser(user: User): AuthResult['user'] {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    authProvider: user.authProvider,
    googleId: user.googleId,
    fechaNacimiento: user.fechaNacimiento,
    xpTotal: 0,
    xpActual: 0,
    createdAt: user.createdAt,
  };
}

function generateToken(user: User): string {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '30d' },
  );
}

export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private hashProvider: IHashProvider,
    private googleAuthProvider?: IAuthProvider,
  ) {}

  async registerWithEmail(dto: z.infer<typeof registerSchema>): Promise<AuthResult> {
    const parsed = registerSchema.parse(dto);

    const existing = await this.userRepo.findByEmail(parsed.email);
    if (existing) {
      throw Object.assign(new Error('El email ya esta registrado'), { statusCode: 409 });
    }

    const passwordHash = await this.hashProvider.hash(parsed.password);

    const user = await this.userRepo.registrarConCorreo({
      username: parsed.username,
      email: parsed.email,
      passwordHash,
      fechaNacimiento: parsed.fechaNacimiento,
    });

    return { token: generateToken(user), user: toAuthUser(user) };
  }

  async loginWithEmail(dto: z.infer<typeof loginSchema>): Promise<AuthResult> {
    const parsed = loginSchema.parse(dto);

    const user = await this.userRepo.findByEmailConPassword(parsed.email);
    if (!user || !user.passwordHash) {
      throw Object.assign(new Error('Credenciales invalidas'), { statusCode: 401 });
    }

    const ok = await this.hashProvider.compare(parsed.password, user.passwordHash);
    if (!ok) {
      throw Object.assign(new Error('Credenciales invalidas'), { statusCode: 401 });
    }

    return { token: generateToken(user), user: toAuthUser(user) };
  }

  async googleAuth(dto: z.infer<typeof googleAuthSchema>): Promise<AuthResult> {
    if (!this.googleAuthProvider) {
      throw Object.assign(
        new Error('La autenticacion con Google no esta configurada en el servidor'),
        { statusCode: 503 },
      );
    }

    const parsed = googleAuthSchema.parse(dto);
    const googleUser = await this.googleAuthProvider.verifyToken(parsed.token);

    let user = await this.userRepo.findByGoogleId(googleUser.googleId);

    if (!user) {
      const existingByEmail = await this.userRepo.findByEmail(googleUser.email);
      if (existingByEmail) {
        user = existingByEmail;
      } else {
        user = await this.userRepo.crearConGoogle({
          username: googleUser.nombre,
          email: googleUser.email,
          googleId: googleUser.googleId,
        });
      }
    }

    return { token: generateToken(user), user: toAuthUser(user) };
  }
}
