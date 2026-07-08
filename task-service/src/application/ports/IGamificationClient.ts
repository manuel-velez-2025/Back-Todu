export interface AwardXpPayload {
  userId: string;
  taskDifficulty: 'easy' | 'medium' | 'hard';
  evento?: string;
}

export interface IGamificationClient {
  awardXp(payload: AwardXpPayload): Promise<void>;
}
