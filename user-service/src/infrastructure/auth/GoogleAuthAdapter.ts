import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { GoogleAuthUser, IAuthProvider } from '../../domain/interfaces/IAuthProvider';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

export class GoogleAuthAdapter implements IAuthProvider {
  async verifyToken(token: string): Promise<GoogleAuthUser> {
    if (!client) {
      throw Object.assign(
        new Error('GOOGLE_CLIENT_ID no esta configurado en user-service'),
        { statusCode: 503 },
      );
    }

    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID!,
      });

      const payload: TokenPayload | undefined = ticket.getPayload();
      if (!payload || !payload.email || !payload.sub) {
        throw Object.assign(
          new Error('El token de Google no contiene la informacion necesaria'),
          { statusCode: 401 },
        );
      }

      return {
        email: payload.email,
        nombre: payload.name || payload.email.split('@')[0],
        googleId: payload.sub,
      };
    } catch (err: any) {
      if (err.statusCode) throw err;

      if (err.message?.includes('Token used too late') || err.message?.includes('Invalid token')) {
        throw Object.assign(
          new Error('El token de Google ha expirado o es invalido'),
          { statusCode: 401 },
        );
      }

      throw Object.assign(
        new Error('Error al verificar el token de Google'),
        { statusCode: 502 },
      );
    }
  }
}
