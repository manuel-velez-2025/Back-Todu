import Anthropic from '@anthropic-ai/sdk';

export interface VisionValidation {
  approved: boolean;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
}

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

type AnthropicImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

// El mimetype que reporta el navegador (via multer) no siempre coincide con
// el contenido real del archivo (pasa seguido con capturas de pantalla o
// fotos procesadas por el sistema operativo). La API de Claude valida que
// el media_type declarado coincida EXACTO con los bytes reales de la imagen,
// asi que aqui detectamos el formato real leyendo los "magic numbers"
// (los primeros bytes de cada formato de imagen son siempre los mismos).
function detectMediaType(buffer: Buffer, mimetypeReportado: string): AnthropicImageMediaType {
  if (buffer.length >= 8 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer.length >= 3 &&
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length >= 6 &&
      buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }
  if (buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  // Si no reconocemos los bytes, caemos al mimetype reportado como ultimo
  // recurso (mejor que fallar de inmediato).
  if (mimetypeReportado === 'image/png') return 'image/png';
  if (mimetypeReportado === 'image/gif') return 'image/gif';
  if (mimetypeReportado === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

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
    const mediaType = detectMediaType(buffer, mimetype);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text:
                `La tarea a verificar es: "${taskDescription || 'sin descripcion'}". ` +
                `La imagen muestra evidencia creible de que esta actividad se realizo? ` +
                `No exijas que la foto demuestre la hora exacta (relojes, timestamps): ` +
                `evalua unicamente si la imagen corresponde a la actividad descrita. ` +
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