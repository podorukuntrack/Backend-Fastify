import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import * as schema from "./payment.schema.js";
import * as controller from "./payment.controller.js";

export default async function paymentRoutes(fastify, options) {
  fastify.addHook("preValidation", fastify.authenticate);

  const readRoles = authorize(
    "super_admin",
    "admin",
    "customer_service",
    "customer",
  );
  const writeRoles = authorize("super_admin", "admin");

  // Semua role dengan scope masing-masing bisa melihat payment (Customer hanya unitnya)
  fastify.get(
    "/payments",
    { preHandler: [readRoles] },
    controller.getAllHandler,
  );

  // Customer bisa melihat history payment unitnya: GET /api/v1/units/:id/payments
  fastify.get(
    "/units/:id/payments",
    {
      preHandler: [readRoles, validate(schema.unitIdParamSchema)],
    },
    controller.getByUnitHandler,
  );

  // Hanya admin yang bisa mencatat pembayaran baru
  fastify.post(
    "/payments",
    { preHandler: [writeRoles, validate(schema.createPaymentSchema)] },
    controller.createHandler,
  );
}
