import {spawn} from 'node:child_process';
import {createWriteStream,mkdtempSync,readdirSync} from 'node:fs';
import {createServer} from 'node:net';
const port=await new Promise((resolve,reject)=>{const probe=createServer();probe.once('error',reject);probe.listen(0,'127.0.0.1',()=>{const assigned=probe.address().port;probe.close(()=>resolve(assigned));});});
const storage=mkdtempSync('/tmp/suhba-verification-');
const args=['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js'];
function run(cmd,args,env=process.env){return new Promise((resolve,reject)=>{const child=spawn(cmd,args,{stdio:'inherit',env});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(cmd+' exited '+code)));});}
for(const migration of readdirSync('drizzle').filter(name=>/^\d+.*\.sql$/.test(name)).sort())await run(process.execPath,[...args,'d1','execute','DB','--config','dist/server/wrangler.json','--local','--persist-to',storage,'--file','drizzle/'+migration]);
const log=createWriteStream('/tmp/suhba-verification-worker.log');
const server=spawn(process.execPath,[...args,'dev','--config','dist/server/wrangler.json','--local','--persist-to',storage,'--ip','127.0.0.1','--inspector-port','0','--port',String(port),'--var','ADMIN_USER_IDS:qa-admin'],{stdio:['ignore','pipe','pipe'],detached:true});
server.stdout.pipe(log);server.stderr.pipe(log);
try{let ready=false;for(let n=0;n<80;n++){try{const r=await fetch(`http://127.0.0.1:${port}/api/discovery`);if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw new Error('Verification Worker did not become ready; see /tmp/suhba-verification-worker.log');await run('python3',['tests/integration.py'],{...process.env,SUHBA_TEST_BASE:`http://127.0.0.1:${port}/api/`});}finally{try{process.kill(-server.pid,'SIGTERM');}catch{}log.end();}
