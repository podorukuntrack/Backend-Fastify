import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import * as schema from "./assignment.schema.js";
import * as controller from "./assignment.controller.js";

export default async function assignmentRoutes(fastify, options) {
  fastify.addHook("preValidation", fastify.authenticate);


  // GET - Dapatkan semua assignments
  fastify.get(
    "/",
    {
      schema: {
        description: "Mendapatkan daftar semua assignments/pekerjaan",
        tags: ["Assignments"],
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
            projectId: {
              type: "string",
              format: "uuid",
              description: "Filter berdasarkan Project ID",
            },
            unitId: {
              type: "string",
              format: "uuid",
              description: "Filter berdasarkan Unit ID",
            },
            status: {
              type: "string",
              enum: ["pending", "on_progress", "completed"],
              description: "Filter berdasarkan status pekerjaan",
            },
            search: {
              type: "string",
              description: "Cari assignment berdasarkan nama kontraktor",
            },
          },
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
                    contractorName: { type: "string" },
                    taskDescription: { type: "string" },
                    status: { type: "string" },
                    tanggal_pembelian: { type: "string" },
                    status_kepemilikan: { type: "string" },
                    user: { type: "object", additionalProperties: true },
                    unit: { type: "object", additionalProperties: true },
                    pembayaran: { type: "object", additionalProperties: true },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                  },
                },
              },
              meta: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authorize('super_admin', 'owner', 'admin', 'direksi', 'customer')], // <--- Tambah customer
    },
    controller.getAllHandler,
  );

  // POST - Buat assignment baru
  fastify.post(
    "/",
    {
      schema: {
        description: "Membuat assignment/pekerjaan baru untuk project",
        tags: ["Assignments"],
        body: {
          type: "object",
          required: ["user_id", "unit_id"],
          properties: {
            user_id: {
              type: "string",
              format: "uuid",
              description: "ID customer",
            },
            unit_id: {
              type: "string",
              format: "uuid",
              description: "ID unit",
            },
            project_id: {
              type: "string",
              format: "uuid",
            },
            cluster_id: {
              type: "string",
              format: "uuid",
            },
            tanggal_pembelian: {
              type: "string",
              format: "date",
            },
            status_kepemilikan: {
              type: "string",
              enum: ["active", "inactive", "cancelled", "completed"],
            },
            tipe_pembayaran: {
              type: "string",
              enum: ["cash_lunas", "cash_cicil", "kredit_kpr"],
            },
            harga_total: {
              type: "number",
            },
            tenor_bulan: {
              type: "number",
            },
            keterangan_kpr: {
              type: "string",
            },
            projectId: {
              type: "string",
              format: "uuid",
              description: "ID Project yang memiliki assignment",
            },
            contractorName: {
              type: "string",
              minLength: 3,
              description: "Nama kontraktor/vendor yang mengerjakan",
            },
            taskDescription: {
              type: "string",
              minLength: 5,
              description: "Deskripsi detail pekerjaan yang harus dikerjakan",
            },
            status: {
              type: "string",
              enum: ["pending", "on_progress", "completed"],
              description: "Status awal assignment (default: pending)",
            },
            startDate: {
              type: "string",
              format: "date-time",
              description: "Tanggal mulai pekerjaan (format ISO-8601)",
            },
            endDate: {
              type: "string",
              format: "date-time",
              description: "Tanggal target selesai pekerjaan (format ISO-8601)",
            },
            companyId: {
              type: "string",
              format: "uuid",
              description: "ID Perusahaan (optional untuk admin)",
            },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: { type: "object", additionalProperties: true },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authorize('admin'), // <--- Customer tidak boleh buat
        validate(schema.createAssignmentSchema),
      ],
    },
    controller.createHandler,
  );

  // GET - Detail assignment by ID
  fastify.get(
    "/:id",
    {
      schema: {
        description: "Mendapatkan detail assignment berdasarkan ID",
        tags: ["Assignments"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "ID assignment yang ingin diambil",
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authorize('super_admin', 'owner', 'admin', 'direksi', 'customer'), // <--- Tambah customer
        validate(schema.assignmentIdParamSchema),
      ],
    },
    controller.getByIdHandler,
  );

  // PATCH - Update assignment
  fastify.patch(
    "/:id",
    {
      schema: {
        description: "Mengupdate data assignment",
        tags: ["Assignments"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "ID assignment yang ingin diupdate",
            },
          },
        },
        body: {
          type: "object",
          properties: {
            contractorName: {
              type: "string",
              minLength: 3,
              description: "Nama kontraktor baru",
            },
            taskDescription: {
              type: "string",
              minLength: 5,
              description: "Deskripsi pekerjaan baru",
            },
            status: {
              type: "string",
              enum: ["pending", "on_progress", "completed"],
              description: "Status pekerjaan baru",
            },
            startDate: {
              type: "string",
              format: "date-time",
              description: "Tanggal mulai baru",
            },
            endDate: {
              type: "string",
              format: "date-time",
              description: "Tanggal target selesai baru",
            },
            tanggal_pembelian: { type: "string", format: "date" },
            status_kepemilikan: {
              type: "string",
              enum: ["active", "inactive", "cancelled", "completed"],
            },
            tipe_pembayaran: {
              type: "string",
              enum: ["cash_lunas", "cash_cicil", "kredit_kpr"],
            },
            harga_total: { type: "number" },
            tenor_bulan: { type: "number" },
            keterangan_kpr: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: { type: "object", additionalProperties: true },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authorize('admin'), // <--- Tambah customer
        validate(schema.updateAssignmentSchema),
      ],
    },
    controller.updateHandler,
  );

  fastify.get(
    "/:id/payments",
    {
      schema: {
        description: "Mendapatkan riwayat pembayaran assignment",
        tags: ["Assignments"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authorize('super_admin', 'owner', 'admin', 'direksi', 'customer'),
        validate(schema.assignmentIdParamSchema),
      ],
    },
    controller.getPaymentsHandler,
  );

  fastify.post(
    "/:id/payments",
    {
      schema: {
        description: "Mencatat pembayaran assignment",
        tags: ["Assignments"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authorize('admin'),
        validate(schema.createPaymentSchema),
      ],
    },
    controller.createPaymentHandler,
  );

  fastify.patch(
    "/:id/payments/:paymentId",
    {
      schema: {
        description: "Mengupdate pembayaran assignment",
        tags: ["Assignments"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authorize('admin'),
        validate(schema.updatePaymentSchema),
      ],
    },
    controller.updatePaymentHandler,
  );

  fastify.delete(
    "/:id/payments/:paymentId",
    {
      schema: {
        description: "Menghapus pembayaran assignment",
        tags: ["Assignments"],
        params: {
          type: "object",
          required: ["id", "paymentId"],
          properties: {
            id: { type: "string", format: "uuid" },
            paymentId: { type: "string", format: "uuid" },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authorize('admin'),
        // validate(schema.assignmentIdParamSchema), // Can't easily use if it only validates 'id'
      ],
    },
    controller.deletePaymentHandler,
  );

  // DELETE - Hapus assignment
  fastify.delete(
    "/:id",
    {
      schema: {
        description: "Menghapus assignment",
        tags: ["Assignments"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authorize('admin'),
        validate(schema.assignmentIdParamSchema),
      ],
    },
    controller.deleteHandler,
  );
}
