import * as repo from './dashboard.repository.js';

export const adminDashboardHandler = async (request, reply) => {
  const data = await repo.getAdminStats(request.user.companyId);
  return reply.code(200).send({ success: true, message: 'Admin dashboard data retrieved', data });
};

export const csDashboardHandler = async (request, reply) => {
  const data = await repo.getCSStats(request.user.companyId);
  return reply.code(200).send({ success: true, message: 'CS dashboard data retrieved', data });
};

export const globalDashboardHandler = async (request, reply) => {
  const data = await repo.getGlobalStats();
  return reply.code(200).send({ success: true, message: 'Global dashboard data retrieved', data });
};