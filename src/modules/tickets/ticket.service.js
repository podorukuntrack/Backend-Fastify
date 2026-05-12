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

export const addMessage = async (ticketId, message, userContext) => {
  const ticket = await repo.findTicketById(ticketId, userContext);
  if (!ticket) throw new Error('Ticket not found or access denied');

  return await repo.insertTicketMessage({
    ticketId,
    senderId: userContext.sub,
    message
  });
};