import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import * as schema from "./payment.schema.js";
import * as controller from "./payment.controller.js";

/**
 * CATATAN
 * Route `GET /payments` dan `POST /payments` dihapus.
 *
 * Keduanya memetakan tabel Drizzle `payments` ke tabel fisik `payment_history`
 * dengan kolom yang tidak pernah ada di database (company_id, method, status,
 * updated_at), sehingga selalu membalas 500 untuk semua role. Tidak ada pemanggil:
 * web tidak punya paymentsAPI, dan aplikasi mobile memakai
 * `GET /payments/units/:id/payments` di bawah ini.
 *
 * Pencatatan pembayaran yang aktif dipakai ada di `POST /assignments/:id/payments`,
 * lengkap dengan push notification 'payment_progress' ke customer.
 */
export default async function paymentRoutes(fastify, options) {
  fastify.addHook("preValidation", fastify.authenticate);

  const readRoles = authorize('super_admin', 'owner', 'admin', 'direksi', 'customer');

  // GET - Riwayat pembayaran satu unit (dipakai aplikasi mobile)
  fastify.get(
    "/units/:id/payments",
    {
      schema: {
        description: "Mendapatkan riwayat pembayaran unit tertentu",
        tags: ["Payments"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "ID unit untuk melihat riwayat pembayarannya",
            }
          }
        },
        querystring: {
          type: "object",
          properties: {
            page: {
              type: "string",
              description: "Nomor halaman",
            },
            limit: {
              type: "string",
              description: "Jumlah data per halaman",
            }
          }
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    amount: { type: "number" },
                    status: { type: "string" },
                    method: { type: "string" },
                    paymentDate: { type: "string", format: "date-time" },
                    receiptUrl: { type: "string", format: "uri" },
                    notes: { type: "string" }
                  }
                }
              }
            }
          }
        },
        security: [{ bearerAuth: [] }]
      },
      preHandler: [readRoles, validate(schema.unitIdParamSchema)]
    },
    controller.getByUnitHandler,
  );
}
