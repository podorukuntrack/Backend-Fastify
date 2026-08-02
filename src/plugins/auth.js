import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';

export default fp(async function (fastify, opts) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing in environment');
  }

  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
    cookie: {
      cookieName: 'accessToken',
      signed: false
    }
  });

  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();

      // Validate company context consistency between JWT and client header
      // This detects multi-tab session conflicts where cookie was overwritten by another tab
      const headerCompanyId = request.headers['x-company-id'];
      if (headerCompanyId && request.user.companyId && 
          headerCompanyId !== request.user.companyId) {
        return reply.code(401).send({
          success: false,
          message: 'Sesi konflik terdeteksi. Cookie autentikasi telah berubah dari tab lain. Silakan login ulang.',
          errors: [{ code: 'COMPANY_MISMATCH' }],
        });
      }
    } catch (err) {
      reply.code(401).send({
        success: false,
        message: 'Unauthorized',
        errors: [],
      });
    }
  });
});
