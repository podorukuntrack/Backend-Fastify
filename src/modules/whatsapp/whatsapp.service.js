// src/modules/whatsapp/whatsapp.service.js
import { db } from '../../config/database.js';
import { whatsappLogs } from '../../shared/schemas/schema.js';

export const sendWhatsAppMessage = async (phone, messageText, userContext) => {
  // Simulasi pemanggilan 3rd Party API
  const apiUrl = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_TOKEN;

  try {
    // Fonnte API Integration
    const response = await fetch(apiUrl || 'https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 
        'Authorization': token, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        target: phone, 
        message: messageText 
      })
    });
    
    if (!response.ok) {
      throw new Error(`Fonnte API Error: ${response.status}`);
    }
    
    const result = await response.json();
    if (!result.status) {
      throw new Error(`Fonnte Error: ${result.reason}`);
    }

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