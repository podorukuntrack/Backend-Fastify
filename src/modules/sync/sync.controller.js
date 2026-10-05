import { assertEntity } from './sync.config.js';
import { parseAfterSeq, parseCursorV2, parseLimit, parsePageAfterId } from './sync.service.js';

export function createSyncController(service) {
  return {
    listEventsV2: async (request, reply) => {
      const cursor = parseCursorV2(request.query?.after);
      const limit = parseLimit(request.query?.limit);
      return reply.code(200).send(await service.listEventsV2({ ...cursor, limit }));
    },

    startV2: async (_request, reply) => reply.code(200).send(await service.startCursorV2()),

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
