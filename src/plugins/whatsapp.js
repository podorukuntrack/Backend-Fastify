import fp from 'fastify-plugin';
import { create } from '@open-wa/wa-automate';

let waClient = null;

async function whatsappPlugin(fastify, options) {
  // Jalankan secara asynchronous tanpa memblokir Fastify booting
  create({
    sessionId: "podorukun_session",
    multiDevice: true, // required to enable multiDevice support
    authTimeout: 60, // wait only 60 seconds to get a connection with the host account device
    blockCrashLogs: true,
    disableSpins: true,
    headless: true,
    useChrome: true,
    hostNotificationLang: 'id', // Set notification to Indonesian
    logConsole: false,
    popup: false,
    qrTimeout: 0, // 0 means it will wait forever for you to scan the qr code
  }).then(client => {
    waClient = client;
    console.log('✅ WhatsApp Client successfully initialized!');
  }).catch(error => {
    console.error('❌ Failed to initialize WhatsApp Client:', error);
  });
}

export const getWaClient = () => waClient;

export default fp(whatsappPlugin);
