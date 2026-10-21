import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

// Generates a reviewable candidate only. Does not connect to any database.
function body(sql) {
 const start=sql.indexOf('DO $$ BEGIN');
 const end=sql.indexOf('END $$;',start);
 if(start<0 || end<0 || !sql.slice(start,end).includes('staging_control.identity')) throw new Error('Unexpected staging guard; review source before generating');
 return sql.slice(end+'END $$;'.length);
}
const target=resolve(process.argv[2]||'staging/generated/billing-v2-cutover.sql');
const guard=`BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
DO $$ BEGIN
 IF current_setting('prtrack.target_database',true) IS DISTINCT FROM current_database()
   OR current_setting('prtrack.sync_migration_approved',true) IS DISTINCT FROM 'billing-v2-20261019'
 THEN RAISE EXCEPTION 'Explicit target database and reviewed cutover approval required'; END IF;
 IF (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('companies','projects','clusters','units','users','property_assignments','payment_history'))<>7
 THEN RAISE EXCEPTION 'Track schema preflight failed'; END IF;
END $$;
`;
const sql=guard+body(await readFile(new URL('../staging/sync.sql',import.meta.url),'utf8'))+
 body(await readFile(new URL('../staging/billing.sql',import.meta.url),'utf8'))+'\nCOMMIT;\n';
await mkdir(dirname(target),{recursive:true});await writeFile(target,sql);
console.log('Reviewable additive migration prepared:',target);
