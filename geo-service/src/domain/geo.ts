export interface Place {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  userRatingsTotal: number;
  types: string[];
  geometry: { lat: number; lng: number };
  openNow: boolean | null;
  tip?: string | null;
}
