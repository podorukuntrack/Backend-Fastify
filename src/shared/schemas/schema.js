// src/shared/schemas/schema.js
import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  timestamp,
  pgEnum,
  decimal,
  index,
  jsonb
} from "drizzle-orm/pg-core";

// Definisi Role
export const roleEnum = pgEnum("role", [
  "super_admin",
  "admin",
  "customer_service",
  "customer",
]);

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  company_id: uuid("company_id").references(() => companies.id),
  nama: varchar("nama", { length: 255 }).notNull(), // ✅ key = nama
  email: varchar("email", { length: 255 }).notNull().unique(),
  nomor_telepon: varchar("nomor_telepon", { length: 20 }),
  password_hash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  apple_refresh_token: text("apple_refresh_token"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyIdx: index("users_company_idx").on(table.company_id),
}));

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  token: text("token_hash").notNull(), // Hash dari refresh token
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("rt_user_idx").on(table.userId),
}));

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  namaProyek: varchar("nama_proyek", { length: 255 }).notNull(),
  deskripsi: text("deskripsi"),
  lokasi: text("lokasi"),
  status: varchar("status", { length: 50 }).default("active"),
  createdBy: uuid("created_by").references(() => users.id),
  logoUrl: text("logo_url"),
  themeColor: varchar("theme_color", { length: 50 }).default("#4f46e5"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyIdx: index("projects_company_idx").on(table.companyId),
}));

export const clusters = pgTable("clusters", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),
  projectId: uuid("project_id").notNull(),
  namaCluster: varchar("nama_cluster", { length: 255 }).notNull(),
  jumlahUnit: integer("jumlah_unit").notNull().default(0),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
}, (table) => ({
  companyIdx: index("clusters_company_idx").on(table.companyId),
  projectIdx: index("clusters_project_idx").on(table.projectId),
}));

export const units = pgTable("units", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Relasi ke cluster
  clusterId: uuid("cluster_id")
    .references(() => clusters.id, { onDelete: "cascade" })
    .notNull(),

  // Nomor unit, contoh: A1, B-12, Sakura-05
  nomorUnit: varchar("nomor_unit", { length: 50 }).notNull(),

  // Tipe rumah, contoh: 36/72, 45/90, 60/120
  tipeRumah: varchar("tipe_rumah", { length: 50 }).notNull(),

  // Luas tanah dalam m²
  luasTanah: numeric("luas_tanah", {
    precision: 10,
    scale: 2,
  }),

  // Luas bangunan dalam m²
  luasBangunan: numeric("luas_bangunan", {
    precision: 10,
    scale: 2,
  }),

  // Status pembangunan
  // planned | pondasi | struktur | finishing | ready | handover
  statusPembangunan: varchar("status_pembangunan", {
    length: 50,
  })
    .notNull()
    .default("planned"),

  // Progress 0 - 100
  progressPercentage: integer("progress_percentage").notNull().default(0),
  imageUrl: text("image_url"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
}, (table) => ({
  clusterIdx: index("units_cluster_idx").on(table.clusterId),
}));
// src/shared/schemas/schema.js (Tambahan untuk Phase 2)

export const progress = pgTable("progress", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Relasi ke unit
  unitId: uuid("unit_id")
    .references(() => units.id, { onDelete: "cascade" })
    .notNull(),

  // Tahap pembangunan (misalnya: pondasi, struktur, finishing)
  tahap: varchar("tahap", { length: 100 }).notNull(),

  // Persentase progress (0 - 100)
  progressPercentage: integer("progress_percentage").notNull().default(0),

  // Tanggal update progress
  tanggalUpdate: timestamp("tanggal_update", { withTimezone: true })
    .defaultNow()
    .notNull(),

  // Catatan tambahan
  catatan: text("catatan"),

  // User yang mencatat progress
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  unitIdx: index("progress_unit_idx").on(table.unitId),
}));

export const documentations = pgTable("documentation", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(), // Wajib untuk keamanan multi-tenant
  unitId: uuid("unit_id")
    .references(() => units.id)
    .notNull(),
  progressId: uuid("progress_id").references(() => progress.id), // Nullable (jika dokumen tidak terikat progress tertentu)

  jenis: varchar("jenis", { length: 100 }), // misal: 'foto_progress', 'kontrak', 'kuitansi'
  url: text("url").notNull(), // URL publik dari Cloudflare R2
  r2Key: text("r2_key").notNull(), // Pengganti cloudinary_public_id (Object Key di R2)
  namaFile: varchar("nama_file", { length: 255 }).notNull(),
  ukuranBytes: integer("ukuran_bytes").notNull(),

  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(), // User/Admin yang mengupload
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  companyIdx: index("docs_company_idx").on(table.companyId),
  unitIdx: index("docs_unit_idx").on(table.unitId),
  progressIdx: index("docs_progress_idx").on(table.progressId),
}));

export const assignments = pgTable("property_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  contractorName: varchar("contractor_name", { length: 255 }).notNull(),
  taskDescription: text("task_description").notNull(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, on_progress, completed
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyIdx: index("assignments_company_idx").on(table.companyId),
  projectIdx: index("assignments_project_idx").on(table.projectId),
}));

export const payments = pgTable("payment_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  unitId: uuid("unit_id")
    .references(() => units.id)
    .notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  method: varchar("method", { length: 50 }).notNull(), // transfer, cash, kpr
  status: varchar("status", { length: 50 }).default("pending"), // pending, verified, failed
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyIdx: index("payments_company_idx").on(table.companyId),
  unitIdx: index("payments_unit_idx").on(table.unitId),
}));

// src/shared/schemas/schema.js (Tambahan untuk Phase 3)

export const timelines = pgTable("timelines", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  unitId: uuid("unit_id")
    .references(() => units.id)
    .notNull(),
  taskName: varchar("task_name", { length: 255 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status", { length: 50 }).default("planned"), // planned, on_progress, completed, delayed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyIdx: index("timelines_company_idx").on(table.companyId),
  projectIdx: index("timelines_project_idx").on(table.projectId),
  unitIdx: index("timelines_unit_idx").on(table.unitId),
}));

export const retentions = pgTable("retentions", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  unitId: uuid("unit_id")
    .references(() => units.id)
    .notNull(),
  dueDate: timestamp("due_date").notNull(), // Batas waktu masa retensi
  status: varchar("status", { length: 50 }).default("active"), // active, released, claimed
  notes: text("notes"),
  linkFoto360: text("link_foto_360"),
  photoBeforeUrl: text("photo_before_url"),
  photoAfterUrl: text("photo_after_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyIdx: index("retentions_company_idx").on(table.companyId),
  unitIdx: index("retentions_unit_idx").on(table.unitId),
}));

export const retentionComplaints = pgTable("retention_complaints", {
  id: uuid("id").defaultRandom().primaryKey(),
  retentionId: uuid("retention_id")
    .references(() => retentions.id, { onDelete: 'cascade' })
    .notNull(),
  description: text("description"),
  photoBeforeUrls: jsonb("photo_before_urls").default([]),
  photoAfterUrls: jsonb("photo_after_urls").default([]),
  status: varchar("status", { length: 50 }).default("pending"), // pending, resolved
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  retentionIdx: index("retention_complaints_retention_idx").on(table.retentionId),
}));

export const handovers = pgTable("handovers", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  unitId: uuid("unit_id")
    .references(() => units.id)
    .notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  proposedDate: timestamp("proposed_date"), // Diisi jika customer mengajukan reschedule
  actualDate: timestamp("actual_date"), // Diisi saat serah terima benar-benar terjadi
  status: varchar("status", { length: 50 }).default("menunggu_respon_customer"), // menunggu_respon_customer, menunggu_konfirmasi_admin, dijadwalkan, selesai, delayed, completed, scheduled
  notes: text("notes"),
  imageUrl: text("image_url"),
  documentUrl: text("document_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyIdx: index("handovers_company_idx").on(table.companyId),
  unitIdx: index("handovers_unit_idx").on(table.unitId),
}));

export const handoverDefects = pgTable("handover_defects", {
  id: uuid("id").defaultRandom().primaryKey(),
  handoverId: uuid("handover_id")
    .references(() => handovers.id)
    .notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"), // Bisa integrasi dengan R2 nanti
  status: varchar("status", { length: 50 }).default("reported"), // reported, fixing, resolved
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  handoverIdx: index("defects_handover_idx").on(table.handoverId),
}));

// src/shared/schemas/schema.js (Tambahan untuk Phase 4)

export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(), // Customer yang membuat tiket
  subject: varchar("subject", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("open"), // open, in_progress, resolved, closed
  priority: varchar("priority", { length: 50 }).default("normal"), // low, normal, high
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyIdx: index("tickets_company_idx").on(table.companyId),
  userIdx: index("tickets_user_idx").on(table.userId),
}));

export const ticketMessages = pgTable("ticket_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id")
    .references(() => tickets.id)
    .notNull(),
  senderId: uuid("sender_id")
    .references(() => users.id)
    .notNull(), // Bisa customer atau CS/admin
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  ticketIdx: index("tm_ticket_idx").on(table.ticketId),
}));

export const whatsappLogs = pgTable("whatsapp_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  userId: uuid("user_id").references(() => users.id),
  phone: varchar("nomor_tujuan", { length: 50 }),
  message: text("message_body"),
  templateName: varchar("template_name", { length: 255 }),
  responsePayload: text("response_payload"),
  providerMessageId: varchar("provider_message_id", { length: 255 }),
  status: varchar("status", { length: 50 }).default("sent"),
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  companyIdx: index("wa_company_idx").on(table.companyId),
  userIdx: index("wa_user_idx").on(table.userId),
}));
export const userDevices = pgTable("user_devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  fcmToken: text("fcm_token").notNull().unique(),
  deviceType: varchar("device_type", { length: 20 }), // ios, android
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("devices_user_idx").on(table.userId),
}));

export const banners = pgTable("banners", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id), // Opsional: jika banner spesifik per company
  name: varchar("name", { length: 255 }).notNull(),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  isActive: varchar("is_active", { length: 20 }).default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyIdx: index("banners_company_idx").on(table.companyId),
}));