import fs from 'node:fs';
import path from 'node:path';
import {openBrowser,saveSession} from './auth.mjs';
import {ROOT,now,hash,db,all,get,put,setting,atomic,acquireLock} from './storage.mjs';
import {BASE,parseCourses,parseAssignments,components,collectFiles,safeUrl,scrub,htmlText} from './parsers.mjs';
import {download} from './documents.mjs';

export function jobFile(id){if(!/^[a-zA-Z0-9-]+$/.test(id))throw Error('INVALID_JOB_ID');return path.join(ROOT,'jobs',id+'.json');}
export function jobStatus(id){try{return JSON.parse(fs.readFileSync(jobFile(id),'utf8'));}catch{return {id,status:'not_found'};}}
function errorCode(e){return /^[A-Z_0-9]+$/.test(e.message)?e.message:'RETRIEVAL_FAILED';}
async function html(context,url) {
  const u=new URL(url,BASE);if(u.origin!==BASE)throw Error('UNEXPECTED_ORIGIN');
  for(let retry=0;retry<3;retry++){
    const r=await context.request.get(u.href,{headers:{Accept:'text/html'},timeout:45000});
    if(r.status()===429||r.status()>=500){if(retry<2){await new Promise(r=>setTimeout(r,1000*2**retry));continue;}}
    if(!r.ok())throw Error(`HTTP_${r.status()}`);
    const text=await r.text();
    if(new URL(r.url()).pathname==='/'&&u.pathname!=='/')throw Error('AUTHENTICATION_REQUIRED');
    return text;
  }
}
export function normalizeFeedback(p,a) {
  const visible=p.grades_visible===true && (p.assignment_submission?.active!==false || p.assignment?.show_old_submission_scores===true);
  const questions=(p.questions||[]).map(q=>{
    const sub=(p.question_submissions||[]).find(s=>String(s.question_id)===String(q.id));
    return {id:String(q.id),number:q.full_index||String(q.index),title:q.title,max_score:q.weight,score:visible?sub?.score??null:null,scoring_type:q.scoring_type||'unknown',
      content:scrub(q.content),parameters:scrub(q.parameters),answers:scrub(sub?.answers||[]),page_mapping:scrub(sub?.data),
      rubric_items:visible?scrub((p.rubric_items||[]).filter(r=>String(r.question_id)===String(q.id)).map(r=>({...r,point_effect:q.scoring_type==='negative'?-Number(r.weight):q.scoring_type==='positive'?Number(r.weight):null}))):[],
      rubric_groups:visible?scrub((p.rubric_item_groups||[]).filter(r=>String(r.question_id)===String(q.id))):[],
      comments:visible?scrub(sub?.evaluations||[]):[],annotations:visible?scrub(sub?.annotations||[]):[],
      coverage:sub?'complete':'question_submission_missing'};
  });
  const sub=p.assignment_submission||{};
  return {id:String(sub.id||a.submission_id),assignment_id:a.id,course_id:a.course_id,title:a.title,source_url:a.url,
    submitted_at:sub.created_at||null,active:sub.active,submission_status:sub.status,grades_visible:visible,score:visible?sub.score??a.score:null,
    max_score:p.assignment?.total_points||a.max_score,rubric_visibility:p.assignment?.rubric_visibility_setting||'unknown',
    questions,submitted_files:scrub(p.text_files||[]),regrade_requests:visible?scrub(p.regrade_requests||[]):[],
    page_count:p.pdf_attachment?.page_count||p.image_attachments?.length||null,
    coverage:{questions:questions.length,question_submissions:(p.question_submissions||[]).length,feedback:visible?(questions.length?'complete':'unrecognized'):'not_released',annotations:visible?'structured_coordinates_preserved':'not_released'},fetched_at:now()};
}
async function retrieveSubmission(context,a,{history=true}={}) {
  const content=await html(context,a.url);
  const comps=components(content),p=comps.find(x=>x.name==='AssignmentSubmissionViewer')?.data;
  if(!p) {
    const name=comps.map(x=>x.name).filter(n=>n!=='SessionTimeoutManager');
    return {status:'unsupported_view',components:name,source_url:a.url,documents:[],fetched_at:now()};
  }
  const result=normalizeFeedback(p,a),files=[];
  result.content_revision=hash(JSON.stringify(scrub({assignment:p.assignment,submission:p.assignment_submission,pdf_revision:p.pdf_attachment?{id:p.pdf_attachment.id,updated_at:p.pdf_attachment.updated_at,page_count:p.pdf_attachment.page_count}:null,questions:p.questions,question_submissions:p.question_submissions,rubric:p.rubric_items,groups:p.rubric_item_groups,regrade:p.regrade_requests,visible:p.grades_visible})));
  const previous=get('submission',result.id);
  if(p.assignment?.template_url)files.push({url:p.assignment.template_url,role:'assignment_template',title:'Assignment template'});
  const original=p.paths?.original_file_path||p.pdf_attachment?.url;
  if(original)files.push({url:new URL(original,BASE).href,role:'original_submission',title:p.pdf_attachment?.filename||'Original submission'});
  if(p.grades_visible&&p.paths?.graded_pdf_path&&p.assignment_submission?.export_allowed!==false)files.push({url:new URL(p.paths.graded_pdf_path,BASE).href,role:'graded_submission',title:'Graded submission with rubric and annotations'});
  collectFiles(p.image_attachments,'submitted_image',files);collectFiles(p.text_files,'submitted_file',files);
  collectFiles(p.questions,'question_attachment',files);collectFiles(p.question_submissions?.map(x=>x.answers),'answer_attachment',files);
  // Preserve linked files in visible rich content, without persisting signed URLs.
  for(const q of p.questions||[])for(const item of Array.isArray(q.content)?q.content:[q.content]){
    if(typeof item==='string')for(const match of item.matchAll(/https?:\/\/[^\s"<>]+\.(?:pdf|png|jpg|jpeg|zip|csv|txt)(?:\?[^\s"<>]*)?/gi))files.push({url:match[0],role:'question_attachment',title:'Question attachment'});
  }
  result.documents=[];const seen=new Set();
  for(const file of files){
    const key=`${file.role}|${safeUrl(file.url)}`;if(seen.has(key))continue;seen.add(key);
    const docId=hash(`${a.id}|${file.role}|${safeUrl(file.url)}`).slice(0,24),cached=get('document',docId);
    if(previous?.content_revision===result.content_revision && cached && fs.existsSync(cached.path) && ['graded_submission','original_submission'].includes(file.role)){
      result.documents.push({id:docId,status:'downloaded',role:file.role,title:cached.title,bytes:cached.bytes,page_count:cached.page_count,extraction:cached.extraction});
    }else result.documents.push(await download(context,file,a));
  }
  result.coverage.documents={discovered:files.length,unique:seen.size,downloaded:result.documents.filter(d=>d.status==='downloaded').length};
  result.history={status:'not_exposed',attempts:[]};
  if(history&&(Array.isArray(p.past_submissions)||p.paths?.submission_react_path)){
    try{
      let attempts=p.past_submissions;
      if(!Array.isArray(attempts)){
        const url=new URL(p.paths.submission_react_path,BASE);if(url.origin!==BASE)throw Error('UNEXPECTED_ORIGIN');
        url.searchParams.append('only_keys[]','past_submissions');
        const r=await context.request.get(url.href,{timeout:30000});if(!r.ok())throw Error('HISTORY_FAILED');
        attempts=(await r.json()).past_submissions;
      }
      if(!Array.isArray(attempts))throw Error('HISTORY_FORMAT_UNRECOGNIZED');
      result.history={status:'complete',attempts:scrub(attempts.map(({activate_path,can_activate,...s})=>s))};
      for(const attempt of attempts){
        if(String(attempt.id)===result.id)continue;
        if(!attempt.show_path || !new RegExp(`^/courses/${a.course_id}/assignments/${a.id}/submissions/\\d+$`).test(attempt.show_path)){
          result.history.status='partial';continue;
        }
        try {const previous=await retrieveSubmission(context,{...a,url:BASE+attempt.show_path,submission_id:String(attempt.id)},{history:false});if(previous.status!=='retrieved')result.history.status='partial';}
        catch {result.history.status='partial';}
      }
    }catch(e){result.history={status:'failed',error:errorCode(e),attempts:[]};}
  }
  result.status=result.documents.some(d=>d.status!=='downloaded')||result.coverage.feedback==='unrecognized'||['failed','partial'].includes(result.history.status)?'partial':'retrieved';
  put('submission',result.id,result,result.questions.map(q=>[q.title,htmlText(JSON.stringify(q))].join('\n')).join('\n'));
  return result;
}
export async function sync({course_id,assignment_id,job_id=`sync-${Date.now()}`}={}) {
  const state={id:job_id,status:'running',started_at:now(),courses:0,assignments:0,submissions:0,documents:0,failures:[],changes:0};
  atomic(jobFile(job_id),state);let release,browser,context;
  try{
    release=acquireLock();({browser,context}=await openBrowser());
    const courses=parseCourses(await html(context,BASE+'/account'));
    if(!course_id&&!assignment_id){
      const listed=new Set(courses.map(c=>c.id));
      for(const old of all('course'))if(!listed.has(old.id))put('course',old.id,{...old,access:'not_in_latest_listing',last_checked_at:now()});
    }
    setting('connection',{status:'connected',verified_at:now()});
    for(const course of courses){
      const existing=get('course',course.id);if(existing?.coverage)course.coverage=existing.coverage;
      course.fetched_at=now();put('course',course.id,course);if(course_id&&course.id!==String(course_id))continue;
      state.courses++;state.current_course=course.name;atomic(jobFile(job_id),state);
      if(course.access!=='accessible'){state.failures.push({course_id:course.id,error:course.access});continue;}
      let assignments;
      try{assignments=parseAssignments(await html(context,course.url),course.id);}catch(e){state.failures.push({course_id:course.id,error:errorCode(e)});continue;}
      course.coverage={discovered:assignments.length,expected:course.expected_assignments,status:course.expected_assignments===null||assignments.length===course.expected_assignments?'complete':'count_mismatch'};
      if(course.coverage.status!=='complete')state.failures.push({course_id:course.id,error:'ASSIGNMENT_COUNT_MISMATCH'});
      put('course',course.id,course);
      if(course.coverage.status==='complete'){
        const listed=new Set(assignments.map(a=>a.id));
        for(const old of all('assignment',course.id))if(!listed.has(old.id)&&old.availability!=='not_in_latest_listing')put('assignment',old.id,{...old,availability:'not_in_latest_listing',coverage:{...old.coverage,metadata:'not_in_latest_listing'}});
      }
      for(const entry of assignments){
        if(assignment_id&&entry.id!==String(assignment_id))continue;
        state.current_assignment=entry.title;atomic(jobFile(job_id),state);
        const attachmentInputs=entry.attachments;entry.attachments=[];entry.fetched_at=now();
        for(const f of attachmentInputs)entry.attachments.push(await download(context,f,entry));
        if(entry.submission_id&&entry.url){
          try{
            const sub=await retrieveSubmission(context,entry);
            entry.coverage.submission=sub.status;entry.coverage.feedback=sub.coverage?.feedback||'unsupported_view';
            entry.attachments.push(...sub.documents.filter(d=>d.role==='assignment_template'));
            if(sub.status==='unsupported_view')state.failures.push({assignment_id:entry.id,error:'UNSUPPORTED_SUBMISSION_VIEW'});
            else if(sub.status==='partial')state.failures.push({assignment_id:entry.id,error:'SUBMISSION_PARTIAL'});
            else {state.submissions++;state.documents+=sub.documents.filter(d=>d.status==='downloaded').length;}
          }catch(e){entry.coverage.submission='failed';state.failures.push({assignment_id:entry.id,error:errorCode(e)});}
        }else {entry.coverage.submission='no_submission';entry.coverage.feedback='not_applicable';}
        entry.coverage.materials=entry.attachments.some(d=>d.status!=='downloaded')?'partial':entry.attachments.length?'downloaded':'no_template_exposed_on_dashboard';
        state.documents+=entry.attachments.filter(d=>d.status==='downloaded').length;
        state.changes+=put('assignment',entry.id,entry)?1:0;state.assignments++;
      }
    }
    saveSession(await context.storageState());
    state.documents=all('document').filter(d=>(!course_id||d.course_id===String(course_id))&&(!assignment_id||d.assignment_id===String(assignment_id))).length;
    state.changes=db.prepare('SELECT COUNT(*) AS n FROM changes WHERE at>=?').get(state.started_at).n;
    delete state.current_assignment;delete state.current_course;
    state.status=state.failures.length?'partial':'complete';state.finished_at=now();
    setting('last_sync',state);
    if(!course_id&&!assignment_id)setting('last_full_sync',state);
  }catch(e){state.status='failed';state.error=errorCode(e);state.finished_at=now();if(state.error==='AUTHENTICATION_REQUIRED')setting('connection',{status:'authentication_required',checked_at:now()});}
  finally{if(browser)await browser.close();if(release)release();delete state.current_assignment;delete state.current_course;atomic(jobFile(job_id),state);}
  return state;
}
