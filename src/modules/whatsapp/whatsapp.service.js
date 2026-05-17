// src/modules/whatsapp/whatsapp.service.js
import { db } from '../../config/database.js';
import { whatsappLogs } from '../../shared/schemas/schema.js';

export const sendWhatsAppMessage = async (phone, messageText, userContext) => {
  // Simulasi pemanggilan 3rd Party API
  const apiUrl = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_TOKEN;

  try {
    /* CONTOH FETCH KE WA API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message: messageText })
    });
    if (!response.ok) throw new Error('API Provider Error');
    */

    // Catat ke log
    await db.insert(whatsappLogs).values({
      companyId: userContext.role === 'super_admin' ? null : userContext.companyId,
      phone,
      message: messageText,
      status: 'sent'
    });

    return true;
  } catch (error) {
    // Catat gagal
    await db.insert(whatsappLogs).values({
      companyId: userContext.role === 'super_admin' ? null : userContext.companyId,
      phone,
      message: messageText,
      status: 'failed'
    });
    throw new Error('Failed to send WhatsApp message');
  }
};