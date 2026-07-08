import Anthropic from '@anthropic-ai/sdk';

export interface VisionValidation {
  approved: boolean;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
}

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export class ClaudeVisionAdapter {

  async validateEvidence(
    buffer: Buffer,
    mimetype: string,
    taskDescription: string,
  ): Promise<VisionValidation> {
    if (!anthropic) {
      return {
        approved: true,
        reason: 'ANTHROPIC_API_KEY no configurada: se aprobo automaticamente sin validar con IA.',
        confidence: 'low',
      };
    }

    const base64 = buffer.toString('base64');
    const mediaType = mimetype === 'image/png' ? 'image/png' : 'image/jpeg';

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as any, data: base64 },
            },
            {
              type: 'text',
              text:
                `La tarea a verificar es: "${taskDescription || 'sin descripcion'}". ` +
                `La imagen muestra evidencia creible de que esta tarea se completo? ` +
                `Responde UNICAMENTE con un JSON valido, sin texto adicional, con esta forma exacta: ` +
                `{"approved": boolean, "reason": "string breve en espanol", "confidence": "low"|"medium"|"high"}`,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    const raw = textBlock && 'text' in textBlock ? textBlock.text : '{}';

    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        approved: Boolean(parsed.approved),
        reason: String(parsed.reason || 'Sin motivo especificado'),
        confidence: ['low', 'medium', 'high'].includes(parsed.confidence) ? parsed.confidence : 'low',
      };
    } catch {
      return {
        approved: false,
        reason: 'No se pudo interpretar la respuesta de la IA, intentelo de nuevo.',
        confidence: 'low',
      };
    }
  }
}
