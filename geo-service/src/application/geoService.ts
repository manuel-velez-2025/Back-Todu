import { z } from 'zod';
import { GooglePlacesAdapter } from '../infrastructure/external/googlePlacesAdapter';
import { ClaudeTipAdapter } from '../infrastructure/external/claudeTipAdapter';

export const cercanosQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  type: z.string().optional(),
  radius: z.coerce.number().optional(),
  keyword: z.string().optional(),
});

export class GeoService {
  constructor(
    private places: GooglePlacesAdapter,
    private tips: ClaudeTipAdapter,
  ) {}

  async buscarCercanos(query: unknown) {
    const parsed = cercanosQuerySchema.parse(query);
    const resultados = await this.places.buscarCercanos(parsed);

    // Genera el tip de IA en paralelo para cada lugar (cacheado por
    // place_id — ver ClaudeTipAdapter). Si Anthropic no está
    // configurado, "tip" simplemente viene como null.
    const conTips = await Promise.all(
      resultados.map(async (place) => ({
        ...place,
        tip: await this.tips.generarTip(place),
      })),
    );

    return {
      places: conTips,
      totalResults: conTips.length,
      query: { lat: parsed.lat, lng: parsed.lng },
    };
  }
}
