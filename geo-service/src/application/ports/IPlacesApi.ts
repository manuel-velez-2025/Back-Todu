import type { Place } from '../../domain/geo';

export interface IPlacesApi {
  buscarCercanos(params: {
    lat: number;
    lng: number;
    type?: string;
    radius?: number;
    keyword?: string;
  }): Promise<Place[]>;
}
