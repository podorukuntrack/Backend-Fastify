import * as repo from './dashboard.repository.js';
import { withCache } from '../../shared/utils/cache.js';

export const adminDashboardHandler = async (request, reply) => {
  const cacheKey = `dashboard:admin:${request.user.companyId || 'all'}`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await repo.getAdminStats(request.user.companyId);
  }, 300);
  return reply.code(200).send({ success: true, message: 'Admin dashboard data retrieved', data, source });
};

export const csDashboardHandler = async (request, reply) => {
  const cacheKey = `dashboard:cs:${request.user.companyId || 'all'}`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await repo.getCSStats(request.user.companyId);
  }, 300);
  return reply.code(200).send({ success: true, message: 'CS dashboard data retrieved', data, source });
};

export const globalDashboardHandler = async (request, reply) => {
  const cacheKey = `dashboard:global`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await repo.getGlobalStats();
  }, 300);
  return reply.code(200).send({ success: true, message: 'Global dashboard data retrieved', data, source });
};