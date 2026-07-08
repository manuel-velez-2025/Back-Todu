import { z } from 'zod';
import { UserRepository } from '../infrastructure/repositories/UserRepository';
import { ITEMS_VALIDOS } from '../domain/User';

export const itemSchema = z.object({
  itemId: z.enum(ITEMS_VALIDOS, {
    errorMap: () => ({ message: `Item inválido. Válidos: ${ITEMS_VALIDOS.join(', ')}` }),
  }),
});

export class InventoryService {
  constructor(private userRepo: UserRepository) {}

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

  async equipar(userId: string, dto: unknown) {
    const parsed = itemSchema.parse(dto);
    return this.userRepo.equiparItem(userId, parsed.itemId);
  }

  async desequipar(userId: string, dto: unknown) {
    const parsed = itemSchema.parse(dto);
    await this.userRepo.desequiparItem(userId, parsed.itemId);
  }
}
