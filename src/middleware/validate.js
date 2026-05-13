export const validate = (schema) => {
  return async (request, reply) => {
    try {
      if (schema.body) request.body = schema.body.parse(request.body);
      if (schema.query) request.query = schema.query.parse(request.query);
      if (schema.params) request.params = schema.params.parse(request.params);
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: 'Validation failed',
        errors: error.errors?.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })) ?? [{ field: 'unknown', message: error.message }]
      });
    }
  };
};