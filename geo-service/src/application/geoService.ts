import { z } from 'zod';
import type { Place } from '../domain/geo';
import type { ITipGenerator } from './ports/ITipGenerator';
import type { IPlaceSummaryRepository } from './ports/IPlaceSummaryRepository';
import type { IPlacesApi } from './ports/IPlacesApi';

export const cercanosQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  type: z.string().optional(),
  radius: z.coerce.number().optional(),
  keyword: z.string().optional(),
});

export class GeoService {
  constructor(
    private placesApi: IPlacesApi,
    private tipGenerator: ITipGenerator,
    private placeSummaryRepo: IPlaceSummaryRepository,
  ) {}

  async buscarCercanos(query: unknown) {
    const parsed = cercanosQuerySchema.parse(query);
    const resultados = await this.placesApi.buscarCercanos(parsed);

    const conTips = await Promise.all(
      resultados.map(async (place) => {
        const tip = await this.obtenerTipConCache(place);
        return { ...place, tip };
      }),
    );

    return {
      places: conTips,
      totalResults: conTips.length,
      query: { lat: parsed.lat, lng: parsed.lng },
    };
  }

  private async obtenerTipConCache(place: Place): Promise<string> {
    const cached = await this.placeSummaryRepo.findByPlaceId(place.id);
    if (cached) {
      return cached.tip;
    }

    const tip = await this.tipGenerator.generarTip(
      place.id,
      place.name,
      place.types,
      place.rating,
      place.userRatingsTotal,
    );

    this.placeSummaryRepo.upsert({
      placeId: place.id,
      name: place.name,
      address: place.address,
      rating: place.rating,
      userRatingsTotal: place.userRatingsTotal,
      types: place.types,
      tip,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).catch((err) => {
      console.error('Error al guardar tip en cache para', place.id, err);
    });

    return tip;
  }
}
