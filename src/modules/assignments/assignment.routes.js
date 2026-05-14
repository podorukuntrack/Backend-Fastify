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
              example: "1",
            },
            limit: {
              type: "string",
              description: "Jumlah data per halaman (default: 20)",
              example: "10",
            },
            projectId: {
              type: "string",
              format: "uuid",
              description: "Filter berdasarkan Project ID",
              example: "550e8400-e29b-41d4-a716-446655440000",
            },
            status: {
              type: "string",
              enum: ["pending", "on_progress", "completed"],
              description: "Filter berdasarkan status pekerjaan",
              example: "on_progress",
            },
            search: {
              type: "string",
              description: "Cari assignment berdasarkan nama kontraktor",
              example: "PT. Konstruksi Jaya",
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
      preHandler: [authorize("super_admin", "admin", "customer")], // <--- Tambah customer
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
              example: "550e8400-e29b-41d4-a716-446655440000",
            },
            contractorName: {
              type: "string",
              minLength: 3,
              description: "Nama kontraktor/vendor yang mengerjakan",
              example: "PT. Konstruksi Jaya",
            },
            taskDescription: {
              type: "string",
              minLength: 5,
              description: "Deskripsi detail pekerjaan yang harus dikerjakan",
              example: "Pekerjaan struktur beton dan finishing dinding",
            },
            status: {
              type: "string",
              enum: ["pending", "on_progress", "completed"],
              description: "Status awal assignment (default: pending)",
              example: "pending",
            },
            startDate: {
              type: "string",
              format: "date-time",
              description: "Tanggal mulai pekerjaan (format ISO-8601)",
              example: "2024-06-01T10:00:00Z",
            },
            endDate: {
              type: "string",
              format: "date-time",
              description: "Tanggal target selesai pekerjaan (format ISO-8601)",
              example: "2024-08-01T17:00:00Z",
            },
            companyId: {
              type: "string",
              format: "uuid",
              description: "ID Perusahaan (optional untuk admin)",
              example: "550e8400-e29b-41d4-a716-446655440001",
            },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: { type: "object" },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authorize("super_admin", "admin"), // <--- Customer tidak boleh buat
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
              example: "550e8400-e29b-41d4-a716-446655440000",
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
                properties: {
                  id: { type: "string", format: "uuid" },
                  contractorName: { type: "string" },
                  taskDescription: { type: "string" },
                  status: { type: "string" },
                  startDate: { type: "string", format: "date-time" },
                  endDate: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authorize("super_admin", "admin", "customer"), // <--- Tambah customer
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
              example: "550e8400-e29b-41d4-a716-446655440000",
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
              example: "PT. Konstruksi Maju",
            },
            taskDescription: {
              type: "string",
              minLength: 5,
              description: "Deskripsi pekerjaan baru",
              example: "Pekerjaan struktur beton, finishing dinding, dan cat",
            },
            status: {
              type: "string",
              enum: ["pending", "on_progress", "completed"],
              description: "Status pekerjaan baru",
              example: "on_progress",
            },
            startDate: {
              type: "string",
              format: "date-time",
              description: "Tanggal mulai baru",
              example: "2024-06-05T08:00:00Z",
            },
            endDate: {
              type: "string",
              format: "date-time",
              description: "Tanggal target selesai baru",
              example: "2024-08-10T17:00:00Z",
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
              data: { type: "object" },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        authorize("super_admin", "admin"), // <--- Tambah customer
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
        authorize("super_admin", "admin", "customer"),
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
        authorize("super_admin", "admin"),
        validate(schema.createPaymentSchema),
      ],
    },
    controller.createPaymentHandler,
  );
}
