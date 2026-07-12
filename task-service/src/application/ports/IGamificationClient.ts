export interface AwardXpPayload {
  userId: string;
  xp: number;
  evento?: string;
  token?: string;
}

export interface IGamificationClient {
  awardXp(payload: AwardXpPayload): Promise<void>;
}