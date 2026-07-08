export interface AddXpResult {
  xpTotal: number;
  subioDeNivel: boolean;
}

export interface RobotStatus {
  usuarioId: string;
  xpTotal: number;
  nivel: number;
  fase: 'huevo' | 'cria' | 'adulto';
  rachaActual: number;
  tareasCompletadas: number;
}

export interface AwardXpDTO {
  userId: string;
  xp: number;
  evento?: string;
}

export interface IGamificationRepository {
  addXp(usuarioId: string, xpToAdd: number): Promise<AddXpResult>;
  getRobotStatus(usuarioId: string): Promise<RobotStatus>;
}
