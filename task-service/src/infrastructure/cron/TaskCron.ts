import cron from 'node-cron';
import { TaskService } from '../../application/taskService';
import { PushNotifier } from '../external/PushNotifier';

export function iniciarCronTareasVencidas(taskService: TaskService): void {
  const pushNotifier = new PushNotifier();

  cron.schedule('* * * * *', async () => {
    try {
      await taskService.processOverdueTasks();
    } catch (err) {
      console.error('[TaskCron] Error al procesar tareas vencidas:', err);
    }
    try {
      const porVencer = await taskService.getTareasPorVencerEn(10);
      for (const t of porVencer) {
        await pushNotifier.notificar(t.usuarioId, 'Tarea por vencer', `${t.titulo} vence en 10 minutos`);
        await taskService.marcarNotificada(t.id, 'por_vencer');
      }
    } catch (err) {
      console.error('[TaskCron] Error enviando notificaciones de tareas por vencer:', err);
    }
  });

  cron.schedule(
    '5 0 * * *',
    async () => {
      try {
        await taskService.processDailyFixedTasks();
      } catch (err) {
        console.error('[TaskCron] Error en el ciclo diario de fijas:', err);
      }
    },
    { timezone: 'America/Mexico_City' },
  );

  console.log('[TaskCron] Crons iniciados: vencidas+push (cada minuto) y fijas (00:05 CDMX)');
}