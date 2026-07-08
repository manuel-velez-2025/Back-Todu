import Anthropic from '@anthropic-ai/sdk';
import { ITipGenerator } from '../../application/ports/ITipGenerator';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function generarFallback(name: string, types: string[], rating: number | null): string {
  const tipo = types.length > 0 ? types[0] : 'lugar';
  const estrellas = rating ? `${rating}/5` : 'sin calificacion';
  return `${name} — ${tipo} recomendado. ${estrellas}`;
}

export class ClaudeTipAdapter implements ITipGenerator {
  async generarTip(
    placeId: string,
    name: string,
    types: string[],
    rating: number | null,
    userRatingsTotal: number,
  ): Promise<string> {
    if (!anthropic) {
      return generarFallback(name, types, rating);
    }

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 80,
        messages: [
          {
            role: 'user',
            content:
              `Eres "Todu", un companero de productividad. Da UN solo consejo corto ` +
              `(maximo 120 caracteres, en espanol, primera persona, tono calido) sobre ` +
              `por que este lugar podria servir para enfocarse o relajarse. ` +
              `Lugar: "${name}", tipo: ${types.join(', ')}, ` +
              `calificacion: ${rating ?? 'sin calificacion'} (${userRatingsTotal} resenas). ` +
              `Responde UNICAMENTE con el consejo, sin comillas ni texto adicional.`,
          },
        ],
      });

      const textBlock = message.content.find((b) => b.type === 'text');
      const tip = textBlock && 'text' in textBlock ? textBlock.text.trim() : null;
      return tip ?? generarFallback(name, types, rating);
    } catch (err) {
      console.error('Error generando tip con Claude para', placeId, err);
      return generarFallback(name, types, rating);
    }
  }
}
