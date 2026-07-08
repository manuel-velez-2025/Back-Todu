export interface RobotStatus {
  usuarioId: string;
  xpTotal: number;
  nivel: number;
  fase: 'huevo' | 'cria' | 'adulto';
  rachaActual: number;
  tareasCompletadas: number;
}

const GAMIFICATION_BASE_URL = process.env.GAMIFICATION_SERVICE_URL || 'http://gamification-service:3003';

export class GamificationClient {
  async getRobotStatus(userId: string): Promise<RobotStatus | null> {
    try {
      const response = await fetch(`${GAMIFICATION_BASE_URL}/gamification/robot/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.error(`[GamificationClient] Error HTTP ${response.status} al obtener robot status`);
        return null;
      }

      const data: RobotStatus = await response.json();
      return data;
    } catch (err) {
      console.error('[GamificationClient] Error de red al consultar gamification-service:', err);
      return null;
    }
  }
}
