import {cp, mkdir, writeFile,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {browserConfig} from './config.mjs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const {version:appVersion}=JSON.parse(await readFile('package.json','utf8'));
const config = browserConfig(process.env,appVersion);
await mkdir('dist/vendor', {recursive:true});
await cp('public','dist',{recursive:true});
await cp('node_modules/@supabase/supabase-js/dist/umd/supabase.js','dist/vendor/supabase.js');
await writeFile('dist/runtime-config.js','globalThis.FD_CONFIG = '+JSON.stringify(config)+';\n');
let commit=process.env.VERCEL_GIT_COMMIT_SHA||'';
if(!commit){try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();}catch{commit='local';}}
await writeFile('dist/version.json',JSON.stringify({commit,appVersion,builtAt:new Date().toISOString()})+'\n');
