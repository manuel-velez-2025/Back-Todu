export interface ITipGenerator {
  generarTip(placeId: string, name: string, types: string[], rating: number | null, userRatingsTotal: number): Promise<string>;
}
