import * as service from './ticket.service.js';
import { withCache, clearCachePattern } from '../../shared/utils/cache.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `tickets:list:${request.user.sub}:${JSON.stringify(request.query)}`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await service.getTickets(request.user);
  }, 3600);
  return reply.code(200).send({ success: true, message: 'Tickets retrieved', data, source });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const cacheKey = `tickets:detail:${request.user.sub}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getTicketDetail(request.params.id, request.user);
    }, 3600);
    return reply.code(200).send({ success: true, message: 'Ticket retrieved', data, source });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  const data = await service.createTicket(request.body, request.user);
  await clearCachePattern('tickets:*');
  await clearCachePattern('units:*');
  await clearCachePattern('projects:*');
  return reply.code(201).send({ success: true, message: 'Ticket created', data });
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyTicket(request.params.id, request.body, request.user);
    await clearCachePattern('tickets:*');
    await clearCachePattern('units:*');
    await clearCachePattern('projects:*');
    return reply.code(200).send({ success: true, message: 'Ticket updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const getMessagesHandler = async (request, reply) => {
  try {
    const cacheKey = `tickets:messages:${request.user.sub}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getMessages(request.params.id, request.user);
    }, 3600);
    return reply.code(200).send({ success: true, message: 'Messages retrieved', data, source });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const addMessageHandler = async (request, reply) => {
  try {
    const data = await service.addMessage(request.params.id, request.body.message, request.user);
    await clearCachePattern('tickets:*');
    return reply.code(201).send({ success: true, message: 'Message added', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};