import * as repo from './assignment.repository.js';

export const getAssignments = async (userContext, filters = {}) => {
  return await repo.findAllAssignments(userContext, filters);
};

export const getAssignmentsMeta = async (userContext) => {
  return await repo.countAssignments(userContext);
};

export const getAssignment = async (id, userContext) => {
  const assignment = await repo.findAssignmentById(id, userContext);
  if (!assignment) throw new Error('Assignment not found or access denied');
  return assignment;
};

export const createAssignment = async (data, userContext) => {
  return await repo.insertAssignment(data, userContext);
};

export const modifyAssignment = async (id, data, userContext) => {
  const result = await repo.updateAssignment(id, data, userContext);
  if (!result) throw new Error('Assignment not found or access denied');
  return result;
};

export const getAssignmentPayments = async (id, userContext) => {
  const result = await repo.findPaymentsByAssignmentId(id, userContext);
  if (!result) throw new Error('Assignment not found or access denied');
  return result;
};

export const createAssignmentPayment = async (id, data, userContext) => {
  const result = await repo.insertPayment(id, data, userContext);
  if (!result) throw new Error('Assignment not found or access denied');
  return result;
};
