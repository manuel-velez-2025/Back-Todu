import { z } from 'zod';
import { TiendaRepository } from '../infrastructure/repositories/TiendaRepository';

export const comprarSchema = z.object({ itemId: z.string().min(1) });

export class TiendaService {
  constructor(private repo: TiendaRepository) {}

  async catalogo(userId: string) {
    return { items: await this.repo.getCatalogo(userId) };
  }

  async comprar(userId: string, dto: unknown) {
    const parsed = comprarSchema.parse(dto);
    const item = await this.repo.getItemCatalogo(parsed.itemId);
    if (!item) throw Object.assign(new Error('Esa decoracion no existe'), { statusCode: 404 });
    const { xpDisponible } = await this.repo.comprar(userId, item.item_id, item.precio);
    return { mensaje: `Compraste ${item.nombre}`, itemId: item.item_id, precio: item.precio, xpDisponible };
  }

  async inventario(userId: string) {
    return { items: await this.repo.getInventario(userId) };
  }
}