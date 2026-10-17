// Local prerequisite checks only: never opens the archive, browser or Keychain.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
export function diagnose({platform=process.platform,version=process.versions.node,exists=fs.existsSync,run=spawnSync,resolve=require.resolve}={}) {
 const [major,minor]=version.split('.').map(Number);
 const command=(name,args)=>{try{return run(name,args,{stdio:'ignore',timeout:5000}).status===0;}catch{return false;}};
 const checks=[
  {name:'macOS',ok:platform==='darwin',required:true,fix:'This preview needs macOS Keychain; Windows/Linux are not supported.'},
  {name:'Node.js',ok:major>22||(major===22&&minor>=13),required:true,fix:'Install Node.js 22.13+ (22 or 24 recommended).'},
  {name:'Google Chrome',ok:['/Applications/Google Chrome.app',path.join(os.homedir(),'Applications/Google Chrome.app')].some(exists),required:true,fix:'Install Google Chrome in Applications.'},
  ...['pdftotext','pdftoppm'].map(name=>({name,ok:command(name,['-v']),required:true,fix:'Install Poppler and include its bin directory on PATH.'})),
  {name:'Tesseract',ok:command('tesseract',['--version']),required:false,fix:'Optional: install Tesseract for OCR.'},
  ...['@modelcontextprotocol/server','playwright','cheerio','zod'].map(name=>{let ok=true;try{resolve(name);}catch{ok=false;}return {name,ok,required:true,fix:'Run npm ci in the runtime directory.'};})
 ];
 return {status:checks.every(c=>c.ok||!c.required)?'ready':'needs_setup',checks,live_login_verified:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=diagnose();console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='ready'?0:1;
}
