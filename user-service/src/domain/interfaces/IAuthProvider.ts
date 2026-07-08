export interface GoogleAuthUser {
  email: string;
  nombre: string;
  googleId: string;
}

export interface IAuthProvider {
  verifyToken(token: string): Promise<GoogleAuthUser>;
}
