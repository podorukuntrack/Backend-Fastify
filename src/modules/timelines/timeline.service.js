import * as repo from './timeline.repository.js';
import { findProjectById } from '../projects/project.repository.js';

export const getTimelines = async (userContext) => {
  return await repo.findTimelines(userContext);
};

export const createTimeline = async (data, userContext) => {
  if (userContext.role === 'admin') data.companyId = userContext.companyId;
  const project = await findProjectById(data.projectId, userContext);
  if (!project) throw new Error('Project not found or access denied');
  return await repo.insertTimeline(data);
};

export const modifyTimeline = async (id, data, userContext) => {
  const result = await repo.updateTimeline(id, data, userContext);
  if (!result) throw new Error('Timeline not found or access denied');
  return result;
};

export const removeTimeline = async (id, userContext) => {
  const result = await repo.deleteTimeline(id, userContext);
  if (!result) throw new Error('Timeline not found or access denied');
  return result;
};