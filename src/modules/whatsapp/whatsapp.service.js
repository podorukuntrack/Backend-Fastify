// src/modules/whatsapp/whatsapp.service.js
import { db } from '../../config/database.js';
import { whatsappLogs } from '../../shared/schemas/schema.js';
import { notificationQueue } from '../../shared/utils/queue.js';
import { AppError } from '../../shared/utils/AppError.js';

/**
 * @param {object} options
 * @param {string} [options.templateName] Nama template, dicatat di log.
 * @param {boolean} [options.sensitive]   Jika true, isi pesan TIDAK disimpan ke
 *   whatsapp_logs. Dipakai untuk OTP: log dapat dibaca lewat GET /whatsapp/logs,
 *   sehingga menyimpan kode di sana sama dengan membocorkannya.
 */
export const sendWhatsAppMessage = async (phone, messageText, userContext, options = {}) => {
  // Push the job to the queue
  await notificationQueue.add('sendWhatsApp', { phone, messageText, userContext, options }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  });
  return true;
};

export const processWhatsAppMessage = async (phone, messageText, userContext, options = {}) => {
  try {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }
    const target = `${cleanPhone}@c.us`;

    // Kirim HTTP POST ke OpenWA Docker Microservice
    // Tanpa fallback: nilai cadangan yang ter-commit berarti kunci API-nya publik.
    const apiKey = process.env.OPENWA_API_KEY;
    if (!apiKey) {
      throw new AppError('OPENWA_API_KEY belum dikonfigurasi di server.', 500);
    }
    const sessionId = process.env.OPENWA_SESSION_ID || 'default';
    const apiUrl = process.env.OPENWA_API_URL || 'http://localhost:2785'; // Default port 2785 if mapped
    
    const response = await fetch(`${apiUrl}/api/sendText`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        session: sessionId,
        chatId: target,
        text: messageText
      })
    });

    if (!response.ok) {
      throw new AppError(`Failed to send message via OpenWA Microservice: ${response.statusText}`, 400);
    }

    // Catat ke log
    await db.insert(whatsappLogs).values({
      companyId: userContext?.companyId || null,
      phone: cleanPhone,
      message: options.sensitive ? null : messageText,
      templateName: options.templateName ?? null,
      status: 'sent'
    });

    return true;
  } catch (error) {
    console.error('WhatsApp Service Error:', error);
    // Catat gagal
    try {
      await db.insert(whatsappLogs).values({
        companyId: userContext?.companyId || null,
        phone,
        message: options.sensitive ? null : messageText,
        templateName: options.templateName ?? null,
        status: 'failed'
      });
    } catch (dbError) {
      console.error('Failed to insert whatsapp logs:', dbError);
    }
    throw error; // Throw the actual error so we know what's wrong
  }
};