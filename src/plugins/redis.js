import fp from 'fastify-plugin';
import fastifyRedis from '@fastify/redis';
import { setRedisClient } from '../shared/utils/cache.js';

/**
 * Plugin untuk menghubungkan Fastify dengan Redis
 * Membaca URL Redis dari environment variable REDIS_URL,
 * atau fallback ke redis://localhost:6379 jika tidak ada.
 */
async function redisPlugin(fastify, options) {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  await fastify.register(fastifyRedis, {
    url: redisUrl,
  });

  // Inject Redis client ke utility cache agar bisa di-import dari file mana saja
  setRedisClient(fastify.redis);

  fastify.log.info(`🔌 Redis connected to ${redisUrl}`);
}

export default fp(redisPlugin, {
  name: 'redis-plugin',
});
