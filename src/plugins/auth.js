import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';

export default fp(async function (fastify, opts) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing in environment');
  }

  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
  });

  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({
        success: false,
        message: 'Unauthorized',
        errors: [],
      });
    }
  });
});
