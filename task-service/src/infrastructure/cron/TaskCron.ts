import cron from 'node-cron';
import { TaskService } from '../../application/taskService';

export function iniciarCronTareasVencidas(taskService: TaskService): void {
  cron.schedule('* * * * *', async () => {
    try {
      await taskService.processOverdueTasks();
    } catch (err) {
      console.error('[TaskCron] Error al procesar tareas vencidas:', err);
    }
  });

  console.log('[TaskCron] Cron de tareas vencidas iniciado (cada minuto)');
}
