import * as repo from './assignment.repository.js';

export const getAssignments = async (userContext, filters = {}) => {
  return await repo.findAllAssignments(userContext, filters);
};

export const getAssignmentsMeta = async (filters, userContext) => {
  return await repo.countAssignments(filters, userContext);
};

export const getAssignment = async (id, userContext) => {
  const assignment = await repo.findAssignmentById(id, userContext);
  if (!assignment) throw new Error('Assignment not found or access denied');
  return assignment;
};

import * as unitRepo from '../units/unit.repository.js';

export const createAssignment = async (data, userContext) => {
  const unit = await unitRepo.findUnitById(data.unit_id, userContext);
  if (!unit) throw new Error('Unit not found or access denied');
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

export const modifyAssignmentPayment = async (assignmentId, paymentId, data, userContext) => {
  const result = await repo.updatePayment(assignmentId, paymentId, data, userContext);
  if (!result) throw new Error('Payment or Assignment not found, or access denied');
  return result;
};

export const removeAssignmentPayment = async (assignmentId, paymentId, userContext) => {
  const result = await repo.deletePayment(assignmentId, paymentId, userContext);
  if (!result) throw new Error('Payment or Assignment not found, or access denied');
  return result;
};

export const removeAssignment = async (id, userContext) => {
  const result = await repo.deleteAssignment(id, userContext);
  if (!result) throw new Error('Assignment not found or access denied');
  return result;
};
