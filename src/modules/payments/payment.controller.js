import * as service from './payment.service.js';
import { withCache, CACHE_TTL } from '../../shared/utils/cache.js';

export const getByUnitHandler = async (request, reply) => {
  try {
    const cacheKey = `payments:unit:${request.user.sub}:${request.user.companyId || 'all'}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getPaymentsByUnit(request.params.id, request.user);
    }, CACHE_TTL);
    return reply.code(200).send({ success: true, message: 'Success', data, source });
  } catch (error) {
    throw error;
  }
};
