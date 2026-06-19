import 'dotenv/config';
import { db } from './src/config/database.js';
import * as repo from './src/modules/users/user.repository.js';

async function test() {
  try {
    const userContext = {
      sub: '4fcc6c21-5a32-4f3e-adfb-5ce2a9a8b8db', // any uuid
      role: 'super_admin'
    };
    const res = await repo.findUsers(1, 100, userContext, {});
    console.log(`Found ${res.data.length} users for super_admin:`);
    for (const u of res.data) {
      console.log(`- ${u.nama} (${u.email}) [${u.role}]`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
