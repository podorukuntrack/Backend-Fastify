// src/shared/schemas/schema.js
import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { integer, decimal } from 'drizzle-orm/pg-core';


// Definisi Role
export const roleEnum = pgEnum('role', ['super_admin', 'admin', 'customer_service', 'customer']);

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id').references(() => companies.id),
  nama: varchar('nama', { length: 255 }).notNull(),   // ✅ key = nama
  email: varchar('email', { length: 255 }).notNull(),
  password_hash: text('password_hash').notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});


export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  token: text('token_hash').notNull(), // Hash dari refresh token
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});




export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  namaProyek: varchar('nama_proyek', { length: 255 }).notNull(),
  deskripsi: text('deskripsi'),
  lokasi: text('lokasi'),
  status: varchar('status', { length: 50 }).default('active'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


export const clusters = pgTable('clusters', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const units = pgTable('units', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  clusterId: uuid('cluster_id').references(() => clusters.id).notNull(),
  userId: uuid('user_id').references(() => users.id), // Nullable jika unit belum terjual
  block: varchar('block', { length: 50 }).notNull(),
  number: varchar('number', { length: 50 }).notNull(),
  price: decimal('price', { precision: 15, scale: 2 }),
  status: varchar('status', { length: 50 }).default('available'), // available, reserved, sold
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// src/shared/schemas/schema.js (Tambahan untuk Phase 2)

export const progress = pgTable('progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  unitId: uuid('unit_id').references(() => units.id).notNull(),
  percentage: integer('percentage').notNull().default(0), // 0 - 100
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const documentations = pgTable('documentations', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(), // Wajib untuk keamanan multi-tenant
  unitId: uuid('unit_id').references(() => units.id).notNull(),
  progressId: uuid('progress_id').references(() => progress.id), // Nullable (jika dokumen tidak terikat progress tertentu)
  
  jenis: varchar('jenis', { length: 100 }), // misal: 'foto_progress', 'kontrak', 'kuitansi'
  url: text('url').notNull(), // URL publik dari Cloudflare R2
  r2Key: text('r2_key').notNull(), // Pengganti cloudinary_public_id (Object Key di R2)
  namaFile: varchar('nama_file', { length: 255 }).notNull(),
  ukuranBytes: integer('ukuran_bytes').notNull(),
  
  createdBy: uuid('created_by').references(() => users.id).notNull(), // User/Admin yang mengupload
  createdAt: timestamp('created_at').defaultNow(),
});

export const assignments = pgTable('assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  contractorName: varchar('contractor_name', { length: 255 }).notNull(),
  taskDescription: text('task_description').notNull(),
  status: varchar('status', { length: 50 }).default('pending'), // pending, on_progress, completed
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  unitId: uuid('unit_id').references(() => units.id).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  paymentDate: timestamp('payment_date').notNull(),
  method: varchar('method', { length: 50 }).notNull(), // transfer, cash, kpr
  status: varchar('status', { length: 50 }).default('pending'), // pending, verified, failed
  receiptUrl: text('receipt_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


// src/shared/schemas/schema.js (Tambahan untuk Phase 3)

export const timelines = pgTable('timelines', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  taskName: varchar('task_name', { length: 255 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  status: varchar('status', { length: 50 }).default('planned'), // planned, on_progress, completed, delayed
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const retentions = pgTable('retentions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  unitId: uuid('unit_id').references(() => units.id).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }), // Jumlah dana yang ditahan/garansi
  dueDate: timestamp('due_date').notNull(), // Batas waktu masa retensi
  status: varchar('status', { length: 50 }).default('active'), // active, released, claimed
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const handovers = pgTable('handovers', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  unitId: uuid('unit_id').references(() => units.id).notNull(),
  scheduledDate: timestamp('scheduled_date').notNull(),
  actualDate: timestamp('actual_date'), // Diisi saat serah terima benar-benar terjadi
  status: varchar('status', { length: 50 }).default('scheduled'), // scheduled, completed, delayed
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const handoverDefects = pgTable('handover_defects', {
  id: uuid('id').defaultRandom().primaryKey(),
  handoverId: uuid('handover_id').references(() => handovers.id).notNull(),
  description: text('description').notNull(),
  imageUrl: text('image_url'), // Bisa integrasi dengan R2 nanti
  status: varchar('status', { length: 50 }).default('reported'), // reported, fixing, resolved
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


// src/shared/schemas/schema.js (Tambahan untuk Phase 4)

export const tickets = pgTable('tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(), // Customer yang membuat tiket
  subject: varchar('subject', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).default('open'), // open, in_progress, resolved, closed
  priority: varchar('priority', { length: 50 }).default('normal'), // low, normal, high
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const ticketMessages = pgTable('ticket_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id').references(() => tickets.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(), // Bisa customer atau CS/admin
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const whatsappLogs = pgTable('whatsapp_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  message: text('message').notNull(),
  status: varchar('status', { length: 50 }).default('sent'), // sent, failed
  sentAt: timestamp('sent_at').defaultNow(),
});