import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

interface CacheEntry {
  tip: string;
  expiresAt: number;
}

// Caché en memoria por place_id (no por usuario ni por request) —
// tal como se acordó: el mismo lugar no debería regenerar su tip
// cada vez que alguien lo consulta. Se invalida cada 14 días.
// NOTA: al ser en memoria del proceso, se reinicia si el
// contenedor se redespliega — para producción real conviene
// mover esto a una tabla/Redis, pero para el alcance de este
// proyecto es suficiente y no cuesta nada extra.
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

export class ClaudeTipAdapter {
  async generarTip(place: {
    id: string;
    name: string;
    types: string[];
    rating: number | null;
    userRatingsTotal: number;
  }): Promise<string | null> {
    const cached = cache.get(place.id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.tip;
    }

    if (!anthropic) {
      // Sin llave configurada: no se inventa un tip, se regresa null
      // y el frontend ya sabe usar un tip genérico de respaldo.
      return null;
    }

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 80,
        messages: [
          {
            role: 'user',
            content:
              `Eres "Todú", un compañero de productividad. Da UN solo consejo corto ` +
              `(máximo 120 caracteres, en español, primera persona, tono cálido) sobre ` +
              `por qué este lugar podría servir para enfocarse o relajarse. ` +
              `Lugar: "${place.name}", tipo: ${place.types.join(', ')}, ` +
              `calificación: ${place.rating ?? 'sin calificación'} (${place.userRatingsTotal} reseñas). ` +
              `Responde ÚNICAMENTE con el consejo, sin comillas ni texto adicional.`,
          },
        ],
      });

      const textBlock = message.content.find((b) => b.type === 'text');
      const tip = textBlock && 'text' in textBlock ? textBlock.text.trim() : null;
      if (tip) {
        cache.set(place.id, { tip, expiresAt: Date.now() + CACHE_TTL_MS });
      }
      return tip;
    } catch (err) {
      console.error('Error generando tip con Claude para', place.id, err);
      return null;
    }
  }
}
