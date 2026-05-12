// src/middleware/authorize.js
export function authorize(...roles) {
  return async (request, reply) => {
    // request.user di-inject otomatis oleh fastifyJwt jika lolos 'authenticate'
    if (!request.user || !roles.includes(request.user.role)) {
      return reply.code(403).send({
        success: false,
        message: 'Forbidden: Insufficient privileges',
        errors: []
      });
    }
  };
}