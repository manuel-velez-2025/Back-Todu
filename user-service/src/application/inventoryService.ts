import { z } from 'zod';
import { UserRepository } from '../infrastructure/repositories/UserRepository';
import { ITEMS_VALIDOS } from '../domain/User';
import { GamificationClient } from '../infrastructure/http/GamificationClient';

export const itemSchema = z.object({
  itemId: z.enum(ITEMS_VALIDOS, {
    errorMap: () => ({ message: `Item inválido. Válidos: ${ITEMS_VALIDOS.join(', ')}` }),
  }),
});

export class InventoryService {
  constructor(
    private userRepo: UserRepository,
    private gamificationClient: GamificationClient,
  ) {}

  async getInventario(userId: string) {
    const inventario = await this.userRepo.getInventario(userId);
    const equipado = inventario.find((i) => i.isEquipped);
    return {
      inventario,
      itemEquipado: equipado ? equipado.itemId : null,
    };
  }

  async agregar(userId: string, dto: unknown) {
    const parsed = itemSchema.parse(dto);
    return this.userRepo.agregarItem(userId, parsed.itemId);
  }

  async catalogo(userId: string) {
    return { items: await this.userRepo.getCatalogo(userId) };
  }
  
  async comprar(userId: string, dto: unknown, token: string) {
    const parsed = z.object({ itemId: z.string().min(1) }).parse(dto);

    const item = await this.userRepo.getItemCatalogo(parsed.itemId);
    if (!item) {
      throw Object.assign(new Error('Ese item no existe en la tienda'), { statusCode: 404 });
    }

    const inventarioItem = await this.userRepo.agregarItem(userId, item.itemId);

    let xpDisponible: number;
    try {
      const cobro = await this.gamificationClient.gastarXp(
        token,
        item.precio,
        `compra:${item.itemId}`,
      );
      xpDisponible = cobro.xpDisponible;
    } catch (err) {
      await this.userRepo
        .eliminarItem(userId, item.itemId)
        .catch((e) => console.error('[Tienda] Falló la compensación:', e));
      throw err;
    }

    return {
      mensaje: `Compraste ${item.nombre}`,
      item: inventarioItem,
      precio: item.precio,
      xpDisponible,
    };
  }

  async equipar(userId: string, dto: unknown) {
    const parsed = itemSchema.parse(dto);
    return this.userRepo.equiparItem(userId, parsed.itemId);
  }

  async desequipar(userId: string, dto: unknown) {
    const parsed = itemSchema.parse(dto);
    await this.userRepo.desequiparItem(userId, parsed.itemId);
  }
}
