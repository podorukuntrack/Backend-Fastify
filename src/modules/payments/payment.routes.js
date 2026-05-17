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

  // GET - Dapatkan semua pembayaran
  fastify.get(
    "/payments",
    {
      schema: {
        description: "Mendapatkan daftar semua transaksi pembayaran unit",
        tags: ["Payments"],
        querystring: {
          type: "object",
          properties: {
            page: {
              type: "string",
              description: "Nomor halaman (default: 1)",
              example: "1"
            },
            limit: {
              type: "string",
              description: "Jumlah data per halaman (default: 20)",
              example: "10"
            },
            status: {
              type: "string",
              enum: ["pending", "verified", "failed"],
              description: "Filter berdasarkan status pembayaran",
              example: "verified"
            },
            method: {
              type: "string",
              enum: ["transfer", "cash", "kpr"],
              description: "Filter berdasarkan metode pembayaran",
              example: "transfer"
            },
            fromDate: {
              type: "string",
              format: "date",
              description: "Filter pembayaran dari tanggal",
              example: "2024-01-01"
            },
            toDate: {
              type: "string",
              format: "date",
              description: "Filter pembayaran sampai tanggal",
              example: "2024-12-31"
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
                    unitId: { type: "string", format: "uuid" },
                    amount: { type: "number" },
                    status: { type: "string" },
                    method: { type: "string" },
                    paymentDate: { type: "string", format: "date-time" }
                  }
                }
              }
            }
          }
        },
        security: [{ bearerAuth: [] }]
      },
      preHandler: [readRoles]
    },
    controller.getAllHandler,
  );

  // GET - Dapatkan pembayaran unit spesifik
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
              example: "550e8400-e29b-41d4-a716-446655440000"
            }
          }
        },
        querystring: {
          type: "object",
          properties: {
            page: {
              type: "string",
              description: "Nomor halaman",
              example: "1"
            },
            limit: {
              type: "string",
              description: "Jumlah data per halaman",
              example: "10"
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
                    receiptUrl: { type: "string", format: "uri" }
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

  // POST - Catat pembayaran baru
  fastify.post(
    "/payments",
    {
      schema: {
        description: "Mencatat transaksi pembayaran baru untuk unit",
        tags: ["Payments"],
        body: {
          type: "object",
          required: ["unitId", "amount", "paymentDate", "method"],
          properties: {
            unitId: {
              type: "string",
              format: "uuid",
              description: "ID Unit yang melakukan pembayaran",
              example: "550e8400-e29b-41d4-a716-446655440000"
            },
            amount: {
              type: "number",
              description: "Jumlah pembayaran dalam rupiah",
              example: 100000000
            },
            paymentDate: {
              type: "string",
              format: "date-time",
              description: "Tanggal pembayaran dilakukan (ISO-8601)",
              example: "2024-06-15T14:30:00Z"
            },
            method: {
              type: "string",
              enum: ["transfer", "cash", "kpr"],
              description: "Metode pembayaran",
              example: "transfer"
            },
            status: {
              type: "string",
              enum: ["pending", "verified", "failed"],
              description: "Status pembayaran awal (default: pending)",
              example: "pending"
            },
            receiptUrl: {
              type: "string",
              format: "uri",
              description: "URL bukti pembayaran/kuitansi (optional)",
              example: "https://example.com/receipt-123.pdf"
            },
            companyId: {
              type: "string",
              format: "uuid",
              description: "ID Perusahaan (optional)",
              example: "550e8400-e29b-41d4-a716-446655440001"
            }
          }
        },
        response: {
          201: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  unitId: { type: "string", format: "uuid" },
                  amount: { type: "number" },
                  status: { type: "string" },
                  method: { type: "string" }
                }
              }
            }
          }
        },
        security: [{ bearerAuth: [] }]
      },
      preHandler: [writeRoles, validate(schema.createPaymentSchema)]
    },
    controller.createHandler,
  );
}
