import { pool } from '../db/pool';
import type { PlaceSummary, IPlaceSummaryRepository } from '../../application/ports/IPlaceSummaryRepository';

export class PlaceSummaryRepository implements IPlaceSummaryRepository {
  async findByPlaceId(placeId: string): Promise<PlaceSummary | null> {
    const { rows } = await pool.query(
      'SELECT * FROM place_summaries WHERE place_id = $1',
      [placeId],
    );
    if (!rows[0]) return null;

    const row = rows[0];
    return {
      placeId: row.place_id,
      name: row.name,
      address: row.address,
      rating: row.rating,
      userRatingsTotal: row.user_ratings_total,
      types: row.types,
      tip: row.tip,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async upsert(summary: PlaceSummary): Promise<void> {
    await pool.query(
      `INSERT INTO place_summaries (place_id, name, address, rating, user_ratings_total, types, tip, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
       ON CONFLICT (place_id) DO UPDATE
         SET name = $2,
             address = $3,
             rating = $4,
             user_ratings_total = $5,
             types = $6,
             tip = $7,
             updated_at = now()`,
      [
        summary.placeId,
        summary.name,
        summary.address,
        summary.rating,
        summary.userRatingsTotal,
        summary.types,
        summary.tip,
      ],
    );
  }
}
