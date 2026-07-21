import webpush from 'web-push';
import { pool } from '../db/pool';

const VAPID_CONFIGURADO = !!(
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_SUBJECT
);

if (VAPID_CONFIGURADO) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
} else {
  console.warn('[PushNotifier] VAPID no configurado — las notificaciones push estan deshabilitadas');
}

export class PushNotifier {
  async notificar(usuarioId: string, titulo: string, cuerpo: string): Promise<void> {
    if (!VAPID_CONFIGURADO) return;

    const { rows } = await pool.query(
      `SELECT endpoint, p256dh, auth FROM push_subscripciones WHERE usuario_id = $1`,
      [usuarioId],
    );

    const payload = JSON.stringify({ title: titulo, body: cuerpo });

    for (const sub of rows) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query(`DELETE FROM push_subscripciones WHERE endpoint = $1`, [sub.endpoint]);
        } else {
          console.error('[PushNotifier] Error enviando push:', err);
        }
      }
    }
  }
}