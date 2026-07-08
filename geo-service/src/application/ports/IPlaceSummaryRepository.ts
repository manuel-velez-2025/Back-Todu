export interface PlaceSummary {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  userRatingsTotal: number;
  types: string[];
  tip: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlaceSummaryRepository {
  findByPlaceId(placeId: string): Promise<PlaceSummary | null>;
  upsert(summary: PlaceSummary): Promise<void>;
}
