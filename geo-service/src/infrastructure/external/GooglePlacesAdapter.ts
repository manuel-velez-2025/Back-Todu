import type { Place } from '../../domain/geo';
import type { IPlacesApi } from '../../application/ports/IPlacesApi';

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export class GooglePlacesAdapter implements IPlacesApi {
  async buscarCercanos(params: {
    lat: number;
    lng: number;
    type?: string;
    radius?: number;
    keyword?: string;
  }): Promise<Place[]> {
    if (!GOOGLE_API_KEY) {
      throw Object.assign(
        new Error('GOOGLE_PLACES_API_KEY no esta configurada en geo-service'),
        { statusCode: 503 },
      );
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('location', `${params.lat},${params.lng}`);
    url.searchParams.set('radius', String(params.radius || 1000));
    if (params.type) url.searchParams.set('type', params.type);
    if (params.keyword) url.searchParams.set('keyword', params.keyword);
    url.searchParams.set('key', GOOGLE_API_KEY);

    const response = await fetch(url.toString());
    const data: any = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw Object.assign(
        new Error(`Google Places respondio con status ${data.status}: ${data.error_message || ''}`),
        { statusCode: 502 },
      );
    }

    return (data.results || []).map((r: any): Place => ({
      id: r.place_id,
      name: r.name,
      address: r.vicinity || r.formatted_address || '',
      rating: r.rating ?? null,
      userRatingsTotal: r.user_ratings_total ?? 0,
      types: r.types || [],
      geometry: {
        lat: r.geometry?.location?.lat,
        lng: r.geometry?.location?.lng,
      },
      openNow: r.opening_hours?.open_now ?? null,
    }));
  }
}
