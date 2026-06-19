import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { processWhatsAppMessage } from '../../modules/whatsapp/whatsapp.service.js';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

export const notificationQueue = new Queue('notificationQueue', { connection });

export const notificationWorker = new Worker('notificationQueue', async (job) => {
  if (job.name === 'sendWhatsApp') {
    const { phone, messageText, userContext } = job.data;
    await processWhatsAppMessage(phone, messageText, userContext);
  }
}, { connection });

notificationWorker.on('completed', job => {
  console.log(`[Queue] Job ${job.id} (${job.name}) has completed!`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[Queue] Job ${job.id} (${job.name}) has failed:`, err.message);
});
