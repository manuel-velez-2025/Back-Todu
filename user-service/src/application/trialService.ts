import { UserRepository } from '../infrastructure/repositories/UserRepository';
import type { TrialStatus } from '../domain/TrialStatus';

export class TrialService {
  constructor(private repo: UserRepository) {}

  async getTrialStatus(userId: string): Promise<TrialStatus> {
    const result = await this.repo.getTrialStatus(userId);
    if (!result) {
      throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
    }
    return {
      userId,
      diasRestantes: result.diasRestantes,
      isActive: result.diasRestantes > 0,
    };
  }
}
