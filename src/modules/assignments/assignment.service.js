import * as repo from './assignment.repository.js';
import { findProjectById } from '../projects/project.repository.js';

export const getAssignments = async (userContext) => {
  return await repo.findAllAssignments(userContext);
};

export const getAssignment = async (id, userContext) => {
  const assignment = await repo.findAssignmentById(id, userContext);
  if (!assignment) throw new Error('Assignment not found or access denied');
  return assignment;
};

export const createAssignment = async (data, userContext) => {
  if (userContext.role === 'admin') data.companyId = userContext.companyId;
  
  // Verifikasi kepemilikan project
  const project = await findProjectById(data.projectId, userContext);
  if (!project) throw new Error('Project not found or access denied');

  return await repo.insertAssignment(data);
};

export const modifyAssignment = async (id, data, userContext) => {
  const result = await repo.updateAssignment(id, data, userContext);
  if (!result) throw new Error('Assignment not found or access denied');
  return result;
};