const GAMIFICATION_BASE_URL =
  process.env.GAMIFICATION_SERVICE_URL || 'http://gamification-service:3003';

export class GamificationClient {
 
  async gastarXp(token: string, monto: number, motivo: string): Promise<{ xpDisponible: number }> {
    const response = await fetch(`${GAMIFICATION_BASE_URL}/xp/gastar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ monto, motivo }),
    });

    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw Object.assign(
        new Error(data?.mensaje || `Gamification respondió ${response.status}`),
        { statusCode: response.status },
      );
    }

    return { xpDisponible: data.xpDisponible };
  }
}