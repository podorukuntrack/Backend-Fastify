// Run as root on the staging VPS only. Never pass credentials as CLI arguments.
import { readFileSync, writeFileSync, renameSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { connectStaging } from './guard.js';
let db;
try {
  if (process.getuid?.() !== 0) throw new Error('root required');
  process.loadEnvFile('/etc/prtrack-staging/runtime.env');
  db = await connectStaging();
  await db.end(); db = undefined;
  const old = readFileSync('/etc/prtrack-staging/read-token', 'utf8').trim();
  const read = randomBytes(32).toString('hex'), monitor = randomBytes(32).toString('hex');
  const base = '/etc/prtrack-staging/';
  for (const [name,value] of [['read-token',read],['monitor-token',monitor]]) {
    writeFileSync(base+name+'.next', value+'\n', { mode: 0o600 });
    renameSync(base+name+'.next', base+name); chmodSync(base+name,0o600);
  }
  const env = readFileSync(base+'runtime.env','utf8').split(/\r?\n/)
    .filter(line=>!/^TRACK_(SYNC|MONITOR)_TOKEN=/.test(line)).join('\n').trimEnd();
  writeFileSync(base+'runtime.env.next',env+`\nTRACK_SYNC_TOKEN=${read}\nTRACK_MONITOR_TOKEN=${monitor}\n`,{mode:0o600});
  renameSync(base+'runtime.env.next',base+'runtime.env'); chmodSync(base+'runtime.env',0o600);
  execFileSync('systemctl',['restart','prtrack-staging-api.service'],{stdio:'ignore'});
  for(let i=0;i<30;i++) {
    try { if((await fetch('http://127.0.0.1:3201/health')).ok)break; } catch {}
    await new Promise(r=>setTimeout(r,1000));
  }
  const evidence={};
  for(const [label,token,path] of [
    ['old_read_token',old,'/sync/v2/checksum/companies'],
    ['new_read_token',read,'/sync/v2/events'],
    ['monitor_checksum',monitor,'/sync/v2/checksum/companies'],
    ['monitor_events',monitor,'/sync/v2/events'],
    ['monitor_snapshot',monitor,'/sync/v2/snapshot/companies'],
    ['monitor_start',monitor,'/sync/v2/start']]) {
    evidence[label]=(await fetch('http://127.0.0.1:3201'+path,{headers:{authorization:`Bearer ${token}`}})).status;
  }
  evidence.monitor_put=(await fetch('http://127.0.0.1:3201/sync/v2/checksum/companies',{method:'PUT',headers:{authorization:`Bearer ${monitor}`}})).status;
  if(evidence.old_read_token!==401 || evidence.new_read_token!==200 || evidence.monitor_checksum!==200 ||
    ['monitor_events','monitor_snapshot','monitor_start','monitor_put'].some(k=>![401,403].includes(evidence[k]))) throw new Error('verification failed');
  const checksums={};
  for(const entity of ['companies','projects','clusters','units','customers','assignments','payments']) {
    const response=await fetch('http://127.0.0.1:3201/sync/v2/checksum/'+entity,{headers:{authorization:`Bearer ${monitor}`}});
    if(!response.ok)throw new Error('checksum failed');
    checksums[entity]=await response.json();
  }
  const result={checked_at:new Date().toISOString(),status:evidence,checksums};
  writeFileSync(base+'checksum-evidence.json',JSON.stringify(result,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify(result,null,2));
} catch { console.error('Staging token rotation or verification failed; details withheld'); process.exitCode=1; }
finally {if(db)await db.end();}
