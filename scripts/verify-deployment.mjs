// Read-only verification of a Vercel deployment. Never prints configuration keys.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const origin=process.argv[2]||'https://groom.furdisclosure.com';
const expected=process.argv[3];
if(!expected||!/^[a-f0-9]{40}$/.test(expected))throw Error('Pass the expected full Git commit SHA.');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fetchPath=async path=>{
  const response=await fetch(new URL(path+'?verify='+expected,origin),{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(`${path}: HTTP ${response.status}`);
  return response;
};
const version=await(await fetchPath('/version.json')).json();
if(version.commit!==expected)throw Error(`Deployment pending: expected ${expected}, received ${version.commit}.`);
const files=['index.html','app.js','owner-portal.js','account-store.js','directory.js','style.css','print-plan.js','print-plan.css'];
const assets=await Promise.all(files.map(async file=>{
  const response=await fetchPath('/'+file);
  const remote=Buffer.from(await response.arrayBuffer());
  const local=execFileSync('git',['show',expected+':public/'+file],{cwd:new URL('../',import.meta.url),windowsHide:true});
  if(hash(remote)!==hash(local))throw Error(`Deployed asset differs: ${file}`);
  return {file,status:response.status,matched:true};
}));
const config=await(await fetchPath('/runtime-config.js')).text();
const match=config.match(/globalThis\.FD_CONFIG\s*=\s*(\{.*\});?/);
if(!match)throw Error('Runtime configuration is missing.');
const parsed=JSON.parse(match[1]);
if(parsed.url!=='https://zdpheikochvtjirgskuv.supabase.co'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(parsed.publishableKey||''))throw Error('Expected Supabase publishable configuration is missing.');
const homepage=await fetchPath('/');
console.log(JSON.stringify({url:origin,commit:version.commit,builtAt:version.builtAt,server:homepage.headers.get('server'),homepage_status:homepage.status,supabase_configured:true,assets},null,2));
