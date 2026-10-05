import { assertEntity } from './sync.config.js';
import { parseAfterSeq, parseLimit, parsePageAfterId } from './sync.service.js';

export function createSyncController(service) {
  return {
    listEvents: async (request, reply) => {
      const afterSeq = parseAfterSeq(request.query?.after_seq);
      const limit = parseLimit(request.query?.limit);
      return reply.code(200).send(await service.listEvents({ afterSeq, limit }));
    },

    snapshot: async (request, reply) => {
      assertEntity(request.params.entity);
      const pageAfterId = parsePageAfterId(request.query?.page_after_id);
      const limit = parseLimit(request.query?.limit);
      return reply.code(200).send(await service.getSnapshot({
        entity: request.params.entity,
        pageAfterId,
        limit,
      }));
    },

    checksum: async (request, reply) => {
      assertEntity(request.params.entity);
      return reply.code(200).send(await service.getChecksum({ entity: request.params.entity }));
    },
  };
}
