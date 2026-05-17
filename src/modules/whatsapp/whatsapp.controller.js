import * as service from './whatsapp.service.js';
import { db } from '../../config/database.js';
import { whatsappLogs } from '../../shared/schemas/schema.js';
import { getTenantScope } from '../../shared/utils/scopes.js';

export const sendHandler = async (request, reply) => {
  try {
    const { phone, message } = request.body;
    await service.sendWhatsAppMessage(phone, message, request.user);
    return reply.code(200).send({ success: true, message: 'WhatsApp message processed', data: {} });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message, errors: [] });
  }
};

export const getLogsHandler = async (request, reply) => {
  const scope = getTenantScope(whatsappLogs, request.user);
  // Fetch log langsung via ORM karena tidak butuh business logic rumit
  const data = await db.select().from(whatsappLogs).where(scope).orderBy(whatsappLogs.sentAt);
  return reply.code(200).send({ success: true, message: 'WhatsApp logs retrieved', data });
};