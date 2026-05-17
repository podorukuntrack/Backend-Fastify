import * as service from './timeline.service.js';

export const getAllHandler = async (request, reply) => {
  const data = await service.getTimelines(request.user, request.query);
  return reply.code(200).send({ success: true, message: 'Timelines retrieved', data });
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createTimeline(request.body, request.user);
    return reply.code(201).send({ success: true, message: 'Timeline created', data });
  } catch (error) {
    return reply.code(403).send({ success: false, message: error.message, errors: [] });
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyTimeline(request.params.id, request.body, request.user);
    return reply.code(200).send({ success: true, message: 'Timeline updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeTimeline(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Timeline deleted', data: {} });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};