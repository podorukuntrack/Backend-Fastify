import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import * as schema from "./payment.schema.js";
import * as controller from "./payment.controller.js";

export default async function paymentRoutes(fastify, options) {
  fastify.addHook("preValidation", fastify.authenticate);

  const readRoles = authorize('super_admin', 'owner', 'admin', 'direksi', 'customer');
  const writeRoles = authorize('admin');

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
            },
            limit: {
              type: "string",
              description: "Jumlah data per halaman (default: 20)",
            },
            status: {
              type: "string",
              enum: ["pending", "verified", "failed"],
              description: "Filter berdasarkan status pembayaran",
            },
            method: {
              type: "string",
              enum: ["transfer", "cash", "kpr"],
              description: "Filter berdasarkan metode pembayaran",
            },
            fromDate: {
              type: "string",
              format: "date",
              description: "Filter pembayaran dari tanggal",
            },
            toDate: {
              type: "string",
              format: "date",
              description: "Filter pembayaran sampai tanggal",
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
            },
            amount: {
              type: "number",
              description: "Jumlah pembayaran dalam rupiah",
            },
            paymentDate: {
              type: "string",
              format: "date-time",
              description: "Tanggal pembayaran dilakukan (ISO-8601)",
            },
            method: {
              type: "string",
              enum: ["transfer", "cash", "kpr"],
              description: "Metode pembayaran",
            },
            status: {
              type: "string",
              enum: ["pending", "verified", "failed"],
              description: "Status pembayaran awal (default: pending)",
            },
            receiptUrl: {
              type: "string",
              format: "uri",
              description: "URL bukti pembayaran/kuitansi (optional)",
            },
            companyId: {
              type: "string",
              format: "uuid",
              description: "ID Perusahaan (optional)",
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
