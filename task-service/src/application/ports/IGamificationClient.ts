export interface AwardXpPayload {
  userId: string;
  xp: number;
  evento?: string;
}

export interface IGamificationClient {
  awardXp(payload: AwardXpPayload): Promise<void>;
}
