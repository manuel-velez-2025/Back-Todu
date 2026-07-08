import bcrypt from 'bcrypt';
import { IHashProvider } from '../../domain/interfaces/IHashProvider';

const SALT_ROUNDS = 10;

export class BcryptAdapter implements IHashProvider {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
