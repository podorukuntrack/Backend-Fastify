import * as service from './payment.service.js';

export const getAllHandler = async (request, reply) => {
  const data = await service.getPayments(request.user);
  return reply.code(200).send({ success: true, message: 'Success', data });
};

export const getByUnitHandler = async (request, reply) => {
  try {
    const data = await service.getPaymentsByUnit(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Success', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createPayment(request.body, request.user);
    return reply.code(201).send({ success: true, message: 'Payment recorded', data });
  } catch (error) {
    return reply.code(403).send({ success: false, message: error.message, errors: [] });
  }
};