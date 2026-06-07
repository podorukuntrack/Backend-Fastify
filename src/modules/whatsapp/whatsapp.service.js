// src/modules/whatsapp/whatsapp.service.js
import { db } from '../../config/database.js';
import { whatsappLogs } from '../../shared/schemas/schema.js';


export const sendWhatsAppMessage = async (phone, messageText, userContext) => {
  try {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }
    const target = `${cleanPhone}@c.us`;

    // Kirim HTTP POST ke OpenWA Docker Microservice
    const apiKey = process.env.OPENWA_API_KEY || 'podorukuntrack_secret_123';
    const response = await fetch('http://localhost:2785/api/sendText', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        args: {
          to: target,
          content: messageText
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send message via OpenWA Microservice: ${response.statusText}`);
    }

    // Catat ke log
    await db.insert(whatsappLogs).values({
      companyId: userContext?.companyId || null,
      phone: cleanPhone,
      message: messageText,
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
        message: messageText,
        status: 'failed'
      });
    } catch (dbError) {
      console.error('Failed to insert whatsapp logs:', dbError);
    }
    throw error; // Throw the actual error so we know what's wrong
  }
};