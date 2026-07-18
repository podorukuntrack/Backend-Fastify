// src/modules/tickets/ticket.repository.js
import { db } from '../../config/database.js';
import { tickets, ticketMessages } from '../../shared/schemas/schema.js';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';
import { AppError } from '../../shared/utils/AppError.js';

export const findTickets = async (userContext) => {
  const scope = getTenantScope(tickets, userContext);
  return await db.select().from(tickets).where(scope).orderBy(tickets.createdAt);
};

export const findTicketById = async (id, userContext) => {
  const scope = getTenantScope(tickets, userContext);
  const condition = scope ? and(eq(tickets.id, id), scope) : eq(tickets.id, id);
  const result = await db.select().from(tickets).where(condition).limit(1);
  return result[0];
};

export const insertTicket = async (data) => {
  const result = await db.insert(tickets).values(data).returning();
  return result[0];
};

export const insertTicketMessage = async (data) => {
  const result = await db.insert(ticketMessages).values(data).returning();
  return result[0];
};

export const getTicketMessages = async (ticketId) => {
  return await db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, ticketId)).orderBy(ticketMessages.createdAt);
};

export const updateTicketStatus = async (id, data, userContext) => {
  const scope = getTenantScope(tickets, userContext);
  const conditions = [eq(tickets.id, id)];
  if (scope) conditions.push(scope);

  const result = await db
    .update(tickets)
    .set({
      status: data.status,
      priority: data.priority,
      updatedAt: new Date(),
    })
    .where(and(...conditions))
    .returning();
  return result[0];
};