import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gradescope-mcp-test-'));
const server=fileURLToPath(new URL('../src/server.mjs',import.meta.url));
async function client(cwd){
 const child=spawn(process.execPath,[server],{cwd,env:{...process.env,GRADESCOPE_DATA_DIR:dir,NODE_NO_WARNINGS:'1'},stdio:['pipe','pipe','pipe']});
 const waiting=new Map();let buffer='',seq=0,errors='';
 child.stderr.on('data',s=>errors+=s);
 child.stdout.on('data',data=>{buffer+=data;let i;while((i=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);if(!line)continue;const v=JSON.parse(line);if(v.id&&waiting.has(v.id)){waiting.get(v.id)(v);waiting.delete(v.id);}}});
 const send=x=>child.stdin.write(JSON.stringify(x)+'\n');
 const request=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>reject(Error(`MCP timeout: ${errors}`)),10000);waiting.set(id,r=>{clearTimeout(timer);r.error?reject(Error(JSON.stringify(r.error))):resolve(r.result);});send({jsonrpc:'2.0',id,method,params});});
 await request('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'integration-test',version:'1.0'}});send({jsonrpc:'2.0',method:'notifications/initialized'});
 return {request,close:()=>child.kill()};
}
test('MCP tools respond from different working directories and share the archive',async()=>{
 const a=await client(os.tmpdir()),b=await client('/');
 try{
  const listed=await a.request('tools/list');assert.equal(listed.tools.length,12);
  assert.equal(listed.tools.some(t=>/submit|activate|delete|regrade_request/.test(t.name)),false);
  const x=await a.request('tools/call',{name:'connection_status',arguments:{}}),y=await b.request('tools/call',{name:'connection_status',arguments:{}});
  assert.equal(x.structuredContent.data_directory,dir);assert.equal(y.structuredContent.data_directory,dir);
  const z=await a.request('tools/call',{name:'list_assignments',arguments:{}});assert.equal(z.isError,undefined);assert.equal(z.structuredContent.total,0);
 }finally{a.close();b.close();}
});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
