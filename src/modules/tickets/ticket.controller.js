import * as service from './ticket.service.js';

export const getAllHandler = async (request, reply) => {
  const data = await service.getTickets(request.user);
  return reply.code(200).send({ success: true, message: 'Tickets retrieved', data });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const data = await service.getTicketDetail(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Ticket retrieved', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  const data = await service.createTicket(request.body, request.user);
  return reply.code(201).send({ success: true, message: 'Ticket created', data });
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyTicket(request.params.id, request.body, request.user);
    return reply.code(200).send({ success: true, message: 'Ticket updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const getMessagesHandler = async (request, reply) => {
  try {
    const data = await service.getMessages(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Messages retrieved', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const addMessageHandler = async (request, reply) => {
  try {
    const data = await service.addMessage(request.params.id, request.body.message, request.user);
    return reply.code(201).send({ success: true, message: 'Message added', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};