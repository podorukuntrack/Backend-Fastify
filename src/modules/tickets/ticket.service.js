import * as repo from './ticket.repository.js';

export const getTickets = async (userContext) => {
  return await repo.findTickets(userContext);
};

export const getTicketDetail = async (id, userContext) => {
  const ticket = await repo.findTicketById(id, userContext);
  if (!ticket) throw new Error('Ticket not found or access denied');
  return ticket;
};

export const createTicket = async (data, userContext) => {
  if (userContext.role !== 'super_admin') {
    data.companyId = userContext.companyId;
  }
  // User ID pembuat tiket
  data.userId = userContext.sub; 
  return await repo.insertTicket(data);
};

export const modifyTicket = async (id, data, userContext) => {
  // Hanya admin/CS yang bisa update status tiket, pastikan tiket ada
  const ticket = await repo.findTicketById(id, userContext);
  if (!ticket) throw new Error('Ticket not found or access denied');

  ticket.updatedAt = new Date();
  // Idealnya buat fungsi update di repository, untuk simplifikasi asumsikan kita punya `updateTicketStatus`
  // Karena sebelumnya di repo belum ada fungsi update, kita tambahkan logikanya:
  return await repo.updateTicketStatus(id, data); 
};

export const getMessages = async (ticketId, userContext) => {
  const ticket = await repo.findTicketById(ticketId, userContext);
  if (!ticket) throw new Error('Ticket not found or access denied');
  return await repo.getTicketMessages(ticketId);
};

import { sendPushNotification } from '../../shared/utils/notification.js';
import { db } from '../../config/database.js';
import { users } from '../../shared/schemas/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

export const addMessage = async (ticketId, message, userContext) => {
  const ticket = await repo.findTicketById(ticketId, userContext);
  if (!ticket) throw new Error('Ticket not found or access denied');

  const inserted = await repo.insertTicketMessage({
    ticketId,
    senderId: userContext.sub,
    message
  });

  try {
    if (userContext.role === 'customer') {
      // 1. Notify company Admins/CS
      const adminUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.companyId, ticket.companyId),
            inArray(users.role, ['admin', 'customer_service'])
          )
        );
      
      const adminIds = adminUsers.map(u => u.id);
      if (adminIds.length > 0) {
        await sendPushNotification(
          adminIds,
          `Tiket Baru dari ${userContext.nama || 'Customer'}`,
          message.length > 50 ? `${message.substring(0, 50)}...` : message,
          { type: 'ticket_message', ticketId }
        );
      }
    } else {
      // 2. Notify the customer
      await sendPushNotification(
        ticket.userId,
        'Pesan Baru dari Customer Service',
        message.length > 50 ? `${message.substring(0, 50)}...` : message,
        { type: 'ticket_message', ticketId }
      );
    }
  } catch (e) {
    console.error('Failed to trigger ticket message push notification:', e.message);
  }

  return inserted;
};