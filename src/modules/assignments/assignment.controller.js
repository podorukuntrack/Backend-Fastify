import * as service from './assignment.service.js';

export const getAllHandler = async (request, reply) => {
  const data = await service.getAssignments(request.user, request.query);
  const total = await service.getAssignmentsMeta(request.user);
  const page = Number(request.query.page ?? 1);
  const limit = Number((request.query.limit ?? data.length) || 20);
  return reply.code(200).send({
    success: true,
    message: 'Assignments retrieved',
    data,
    meta: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const data = await service.getAssignment(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Assignment retrieved', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createAssignment(request.body, request.user);
    return reply.code(201).send({ success: true, message: 'Assignment created', data });
  } catch (error) {
    return reply.code(403).send({ success: false, message: error.message, errors: [] });
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyAssignment(request.params.id, request.body, request.user);
    return reply.code(200).send({ success: true, message: 'Assignment updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const getPaymentsHandler = async (request, reply) => {
  try {
    const data = await service.getAssignmentPayments(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Payments retrieved', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createPaymentHandler = async (request, reply) => {
  try {
    const data = await service.createAssignmentPayment(request.params.id, request.body, request.user);
    return reply.code(201).send({ success: true, message: 'Payment created', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};
