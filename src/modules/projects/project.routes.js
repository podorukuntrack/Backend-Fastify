import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import * as schema from "./project.schema.js";
import * as controller from "./project.controller.js";

export default async function projectRoutes(fastify, options) {
  // Pastikan user memiliki JWT yang valid
  fastify.addHook("preValidation", fastify.authenticate);

  // Sesuai Permission Matrix: Hanya super_admin dan admin yang bisa mengakses module ini
  fastify.addHook("preHandler", authorize("super_admin", "owner", "admin", "direksi"));

  // GET - Dapatkan semua projects dengan pagination
  fastify.get(
    "/",
    {
      schema: {
        description:
          "Mendapatkan daftar semua projects dengan pagination dan filter",
        tags: ["Projects"],
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
            search: {
              type: "string",
              description: "Cari project berdasarkan nama",
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
                type: "array", // Untuk GET "/" gunakan array, untuk GET "/:id" gunakan object
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    nama_proyek: { type: "string" }, // Pastikan namanya sama dengan yang diharapkan frontend
                    deskripsi: { type: "string" },
                    lokasi: { type: "string" }, // Tambahkan ini agar muncul
                    status: { type: "string" },
                    logo_url: { type: ["string", "null"] },
                    theme_color: { type: ["string", "null"] },
                    created_at: { type: "string", format: "date-time" }, // Tambahkan ini
                  },
                },
              },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getAllHandler,
  );

  // POST - Buat project baru
  fastify.post(
    "/",
    {
      schema: {
        description: "Membuat project baru",
        tags: ["Projects"],
        body: {
          type: "object",
          required: ["nama_proyek", "lokasi"],
          properties: {
            nama_proyek: { type: "string" },
            deskripsi: { type: "string" },
            lokasi: { type: "string" },
            status: { type: "string" },
            logo_url: { type: ["string", "null"] },
            theme_color: { type: ["string", "null"] },
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
      preHandler: [authorize('admin'), validate(schema.createProjectSchema)],
    },
    controller.createHandler,
  );

  // GET - Dapatkan detail project by ID
  fastify.get(
    "/:id",
    {
      schema: {
        description: "Mendapatkan detail project berdasarkan ID",
        tags: ["Projects"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "ID project yang ingin diambil",
            },
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
          404: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [validate(schema.projectIdParamSchema)],
    },
    controller.getByIdHandler,
  );

  // PATCH - Update project
  fastify.patch(
    "/:id",
    {
      schema: {
        description: "Mengupdate data project",
        tags: ["Projects"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "ID project yang ingin diupdate",
            },
          },
        },
        body: {
          type: "object",
          properties: {
            nama_proyek: {
              type: "string",
              description: "Nama project baru",
            },
            deskripsi: {
              type: "string",
              description: "Deskripsi project baru",
            },
            lokasi: {
              type: "string",
              description: "Lokasi project",
            },
            status: {
              type: "string",
              enum: ["active", "completed", "on_hold"],
              description: "Status project",
            },
            logo_url: {
              type: ["string", "null"],
              description: "Tautan logo baru",
            },
            theme_color: {
              type: ["string", "null"],
              description: "Warna tema baru",
            },
            endDate: {
              type: "string",
              format: "date",
              description: "Tanggal target selesai baru",
            },
            budget: {
              type: "number",
              description: "Budget project baru",
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
              },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authorize('admin'), validate(schema.updateProjectSchema)],
    },
    controller.updateHandler,
  );

  // DELETE - Hapus project
  fastify.delete(
    "/:id",
    {
      schema: {
        description: "Menghapus project",
        tags: ["Projects"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "ID project yang ingin dihapus",
            },
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
          404: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authorize('admin'), validate(schema.projectIdParamSchema)],
    },
    controller.deleteHandler,
  );

  // GET - Dapatkan statistik project
  fastify.get(
    "/:id/stats",
    {
      schema: {
        description: "Mendapatkan statistik dan analytics project",
        tags: ["Projects"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "ID project untuk mendapatkan stats",
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
                  totalUnits: { type: "number" },
                  completedUnits: { type: "number" },
                  progressPercentage: { type: "number" },
                  budgetUsed: { type: "number" },
                  remainingBudget: { type: "number" },
                },
              },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [validate(schema.projectIdParamSchema)],
    },
    controller.getStatsHandler,
  );
}
