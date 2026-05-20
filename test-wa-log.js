import { db } from './src/config/database.js';
import { whatsappLogs } from './src/shared/schemas/schema.js';

async function testInsert() {
  try {
    await db.insert(whatsappLogs).values({
      companyId: null,
      phone: '081234567890',
      message: 'Test message',
      status: 'sent'
    });
    console.log('Insert successful');
  } catch (error) {
    console.error('Insert failed:', error);
  }
  process.exit(0);
}

testInsert();
