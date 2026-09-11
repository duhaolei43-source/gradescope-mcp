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
test('seeded MCP reads paginate, filter, search and preserve question feedback',async()=>{
 process.env.GRADESCOPE_DATA_DIR=dir;
 const {put,db}=await import('../src/storage.mjs');
 const at='2026-01-01T00:00:00.000Z';
 put('course','demo',{id:'demo',course_id:'demo',name:'Synthetic course'});
 for(let i=1;i<=3;i++)put('assignment',String(i),{id:String(i),course_id:'demo',title:`Synthetic HW ${i}`,due_at:`2026-12-0${i}T00:00:00.000Z`,submission_status:i===1?'graded':'No Submission',submission_id:i===1?'s1':null,fetched_at:at});
 put('submission','s1',{id:'s1',assignment_id:'1',grades_visible:true,score:8,max_score:10,questions:[{id:'q1',rubric_items:[{id:'r1',present:true,point_effect:-2},{id:'r2',present:false,point_effect:0}],annotations:[{text:'Synthetic note'}],comments:['Check units']}],fetched_at:at},'Synthetic feedback check units');
 put('document','d1',{id:'d1',assignment_id:'1',title:'Synthetic document',path:path.join(dir,'fake.pdf'),pages:['First synthetic page','Second synthetic page'],page_count:2,extraction:'text',fetched_at:at});
 const c=await client(os.tmpdir());
 const call=async(name,args={})=>{const r=await c.request('tools/call',{name,arguments:args});assert.equal(r.isError,undefined);return r.structuredContent;};
 try{
  assert.equal((await call('list_courses')).items[0].id,'demo');
  const page=await call('list_assignments',{limit:2});assert.equal(page.total,3);assert.equal(page.next_offset,2);assert.equal((await call('list_assignments',{offset:2,limit:2})).items.length,1);
  assert.equal((await call('list_assignments',{status:'graded'})).total,1);
  assert.equal((await call('list_assignments',{due_after:'2026-12-02T00:00:00Z'})).total,2);
  assert.equal((await call('get_assignment',{assignment_id:'1'})).documents.length,1);
  assert.equal((await call('get_submission',{assignment_id:'1'})).questions[0].rubric_items,undefined);
  const feedback=await call('get_feedback',{assignment_id:'1'});assert.equal(feedback.items[0].rubric_items.length,1);assert.equal(feedback.items[0].annotations.length,1);
  assert.equal((await call('get_feedback',{assignment_id:'1',applied_only:false})).items[0].rubric_items.length,2);
  const doc=await call('read_document',{document_id:'d1',page:1,page_count:1});assert.equal(doc.next_page,2);assert.equal(doc.pages[0].text,'First synthetic page');
  assert.equal((await call('search_coursework',{query:'feedback units'})).total,1);
  assert.ok((await call('get_changes',{since:at})).total>=6);
  const missing=await c.request('tools/call',{name:'get_assignment',arguments:{assignment_id:'missing'}});assert.equal(missing.isError,true);assert.match(missing.content[0].text,/ASSIGNMENT_NOT_FOUND/);
  const mismatch=await c.request('tools/call',{name:'get_submission',arguments:{assignment_id:'2',submission_id:'s1'}});assert.equal(mismatch.isError,true);assert.match(mismatch.content[0].text,/MISMATCH/);
  const invalid=await c.request('tools/call',{name:'read_document',arguments:{document_id:'d1',page:0}});assert.equal(invalid.isError,true);
 }finally{c.close();db.close();}
});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
