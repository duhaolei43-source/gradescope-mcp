import {McpServer} from '@modelcontextprotocol/server';
import {StdioServerTransport} from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,db,get,all,setting,now,atomic} from './storage.mjs';
import {jobFile,jobStatus} from './sync.mjs';
import {readDocument} from './documents.mjs';

const server=new McpServer({name:'gradescope-personal',version:'0.1.0'});
const id=z.string().regex(/^[a-zA-Z0-9-]+$/);
const pageArgs={offset:z.number().int().min(0).default(0),limit:z.number().int().min(1).max(100).default(20)};
function paginate(rows,{offset=0,limit=20}){return {items:rows.slice(offset,offset+limit),total:rows.length,next_offset:offset+limit<rows.length?offset+limit:null};}
function launch(command,args={}) {
  const running=fs.readdirSync(path.join(ROOT,'jobs')).filter(f=>f.endsWith('.json')).map(f=>{try{return JSON.parse(fs.readFileSync(path.join(ROOT,'jobs',f),'utf8'));}catch{return {};}}).find(j=>j.status==='running'&&Date.now()-Date.parse(j.started_at)<30*60*1000);
  if(running&&command==='sync')return {job_id:running.id,status:'already_running',note:'Existing job may have a different scope; refresh requested scope after completion if needed.'};
  const job_id=`${command}-${Date.now()}`;
  if(command==='sync')atomic(jobFile(job_id),{id:job_id,status:'running',started_at:now()});
  const child=spawn(process.execPath,[fileURLToPath(new URL('./cli.mjs',import.meta.url)),command,JSON.stringify({...args,job_id})],{detached:true,stdio:'ignore',env:process.env});child.unref();
  return {job_id,status:'started',...(command==='connect'?{instruction:'Complete login in the browser window, then check connection_status.'}:{instruction:'Use sync_status with this job ID after allowing the job to progress.'})};
}
function tool(name,description,schema,fn,readOnly=true){
  server.registerTool(name,{description,inputSchema:z.object(schema),annotations:{readOnlyHint:readOnly,destructiveHint:false,idempotentHint:readOnly,openWorldHint:true}},async args=>{
    try {const result=await fn(args);return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result};}
    catch(e){return {isError:true,content:[{type:'text',text:JSON.stringify({error:/^[A-Z_0-9]+$/.test(e.message)?e.message:'OPERATION_FAILED'})}]};}
  });
}
tool('connection_status','Check stored connection health, synchronization freshness and shared local archive location. This does not verify a live login.',{},()=>({connection:setting('connection'),session_saved_at:setting('session_saved_at'),last_sync:setting('last_sync'),last_full_sync:setting('last_full_sync'),data_directory:ROOT}));
tool('connect','Open a private browser for interactive Gradescope login. Never pass credentials to this tool.',{},()=>launch('connect'),false);
tool('sync','Refresh Gradescope course listings, attachments, submissions, visible rubric and annotations. Runs asynchronously; poll sync_status. Omitting filters checks all courses, including older courses.',{course_id:id.optional(),assignment_id:id.optional()},a=>launch('sync',a),false);
tool('sync_status','Read a background synchronization job. Report partial failures and missing coverage explicitly.',{job_id:id},a=>jobStatus(a.job_id));
tool('list_courses','List all discovered courses across terms. Includes discovery counts, access restrictions and verification time.',pageArgs,a=>paginate(all('course'),a));
tool('list_assignments','List assignment status, scores and effective visible deadlines. Time remaining is calculated now; fetched_at shows source freshness. Paginate to retrieve all.',{...pageArgs,course_id:id.optional(),query:z.string().optional(),due_before:z.string().datetime().optional(),due_after:z.string().datetime().optional(),status:z.enum(['all','not_submitted','submitted','graded']).default('all')},a=>{
  let rows=all('assignment',a.course_id);if(a.query)rows=rows.filter(x=>x.title.toLowerCase().includes(a.query.toLowerCase()));if(a.due_before)rows=rows.filter(x=>x.due_at&&x.due_at<=a.due_before);
  if(a.due_after)rows=rows.filter(x=>x.due_at&&x.due_at>=a.due_after);
  if(a.status==='not_submitted')rows=rows.filter(x=>/no submission/i.test(x.submission_status));
  if(a.status==='submitted')rows=rows.filter(x=>/^submitted$/i.test(x.submission_status));
  if(a.status==='graded')rows=rows.filter(x=>x.submission_status==='graded');
  rows.sort((x,y)=>(x.due_at||'9999').localeCompare(y.due_at||'9999'));
  return {...paginate(rows.map(x=>({id:x.id,course_id:x.course_id,title:x.title,availability:x.availability,submission_status:x.submission_status,score:x.score,max_score:x.max_score,due_at:x.due_at,late_due_at:x.late_due_at,time_left_seconds:x.due_at?Math.floor((Date.parse(x.due_at)-Date.now())/1000):null,url:x.url,fetched_at:x.fetched_at,coverage:x.coverage})),a),calculated_at:now()};
});
tool('get_assignment','Read assignment metadata, material file IDs, original date labels and completeness. Refresh with sync when live verification is needed.',{assignment_id:id},a=>{const r=get('assignment',a.assignment_id);if(!r)throw Error('ASSIGNMENT_NOT_FOUND');return {...r,documents:all('document').filter(d=>d.assignment_id===r.id).map(({pages,...d})=>d)};});
tool('get_submission','Read submitted answers, page mappings, history and document references for an assignment or specific archived attempt.',{assignment_id:id,submission_id:id.optional()},a=>{
  const as=get('assignment',a.assignment_id),r=get('submission',a.submission_id||as?.submission_id);if(!r)throw Error('SUBMISSION_NOT_RETRIEVED');
  if(r.assignment_id!==a.assignment_id)throw Error('SUBMISSION_ASSIGNMENT_MISMATCH');
  return {...r,questions:r.questions.map(({rubric_items,rubric_groups,annotations,comments,...q})=>q)};
});
tool('get_feedback','Read all visible comments and annotations for selected questions. Applied rubric items are returned by default; applied_only=false includes all visible rubric items. Never interpret unapplied items as deductions.',{assignment_id:id,question_id:id.optional(),applied_only:z.boolean().default(true),...pageArgs},a=>{
  const as=get('assignment',a.assignment_id),r=get('submission',as?.submission_id);if(!r)throw Error('FEEDBACK_NOT_RETRIEVED');
  const qs=r.questions.filter(q=>!a.question_id||q.id===a.question_id).map(q=>({...q,rubric_items:q.rubric_items.filter(i=>!a.applied_only||i.present),rubric_items_total:q.rubric_items.length,applied_only:a.applied_only}));
  return {assignment_id:a.assignment_id,score:r.score,max_score:r.max_score,grades_visible:r.grades_visible,rubric_visibility:r.rubric_visibility,...paginate(qs,a),regrade_requests:r.regrade_requests,coverage:r.coverage,source_url:r.source_url,fetched_at:r.fetched_at};
});
tool('read_document','Read original document text by page. The path points to the preserved original. Optional local OCR helps scanned pages; OCR transcription is unverified.',{document_id:id,page:z.number().int().min(1).default(1),page_count:z.number().int().min(1).max(20).default(3),ocr:z.boolean().default(false)},a=>readDocument(a.document_id,a));
tool('search_coursework','Search locally preserved assignment titles, submission feedback and full document text. Returns short evidence snippets and IDs; retrieve original documents for full context.',{query:z.string().min(1).max(200),...pageArgs},a=>{
  const terms=a.query.toLowerCase().split(/\s+/).filter(Boolean);
  const rows=db.prepare('SELECT kind,id,text FROM search').all().filter(r=>terms.every(t=>r.text.toLowerCase().includes(t))).map(r=>{const at=r.text.toLowerCase().indexOf(terms[0]);return {kind:r.kind,id:r.id,snippet:r.text.slice(Math.max(0,at-100),at+500)};});return paginate(rows,a);
});
tool('get_changes','Read compact archive changes since a timestamp. Complete data remains in the archive; changes are not a substitute for coverage checks.',{since:z.string().datetime(),...pageArgs},a=>paginate(db.prepare('SELECT seq,kind,id,at,summary FROM changes WHERE at>? ORDER BY seq').all(a.since),a));
await server.connect(new StdioServerTransport());
