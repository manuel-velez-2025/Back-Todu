import type { IGamificationClient, AwardXpPayload } from '../../application/ports/IGamificationClient';

const GAMIFICATION_BASE_URL = process.env.GAMIFICATION_SERVICE_URL || 'http://gamification-service:3003';

export class GamificationClient implements IGamificationClient {
  async awardXp(payload: AwardXpPayload): Promise<void> {
    const response = await fetch(`${GAMIFICATION_BASE_URL}/gamification/xp/award`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: payload.userId,
        taskDifficulty: payload.taskDifficulty,
        evento: payload.evento ?? 'TASK_COMPLETED',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw Object.assign(
        new Error(`Gamification respondio ${response.status}: ${errorBody}`),
        { statusCode: response.status },
      );
    }
  }
}
