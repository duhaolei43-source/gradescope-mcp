import {load} from 'cheerio';
export const BASE='https://www.gradescope.com';
export const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
export function safeUrl(value) {try {const u=new URL(value,BASE);return u.origin+u.pathname;}catch{return null;}}
export function scrub(value) {
  if(Array.isArray(value)) return value.map(scrub);
  if(value&&typeof value==='object') return Object.fromEntries(Object.entries(value).filter(([k])=>!/(token|password|authenticity|csrf|session|cookie|current_user|course_members|ownerships)/i.test(k)).map(([k,v])=>[k,scrub(v)]));
  if(typeof value==='string') return value.replace(/https?:\/\/[^\s"<>]+/g,s=>safeUrl(s)||'[link]');
  return value;
}
export function parseCourses(html) {
  const $=load(html), courses=[];
  $('a.courseBox').each((_,e)=>{
    const a=$(e),id=a.attr('href')?.match(/^\/courses\/(\d+)$/)?.[1];if(!id)return;
    const count=clean(a.find('.courseBox--assignments').text()).match(/(\d+) assignment/);
    courses.push({id,course_id:id,name:clean(a.find('.courseBox--shortname').text()),description:clean(a.find('.courseBox--name').text()),url:BASE+`/courses/${id}`,expected_assignments:count?Number(count[1]):null,access:a.attr('data-loginrequired')==='true'?'institution_login_required':'accessible'});
  });
  if(!courses.length && !/Your Courses|No courses|haven.t been added/i.test($('body').text()))throw Error('AUTHENTICATION_REQUIRED');
  return courses;
}
export function dateValue(raw) {
  if(!raw)return null;const date=new Date(raw);return Number.isNaN(date.valueOf())?null:date.toISOString();
}
export function parseAssignments(html,courseId) {
  const $=load(html),table=$('#assignments-student-table');
  if(!table.length)throw Error(/session_password|log in to access/i.test(html)?'AUTHENTICATION_REQUIRED':'ASSIGNMENT_TABLE_UNRECOGNIZED');
  const result=[];
  table.find('tbody tr').each((index,row)=>{
    const tr=$(row),primary=tr.find('.table--primaryLink').first();
    if(!primary.length)return;
    const link=primary.find('a,button').first(),href=link.attr('href'),id=link.attr('data-assignment-id')||href?.match(/assignments\/(\d+)/)?.[1];
    const title=clean(primary.text());
    const key=id||`unlinked-${courseId}-${index}`;
    const dates=tr.find('time').toArray().map(t=>({label:$(t).attr('aria-label')||clean($(t).text()),raw:$(t).attr('datetime')}));
    const find=re=>dates.find(d=>re.test(d.label));
    const due=find(/^Due /i),late=find(/Late Due/i),release=find(/Released/i);
    const scoreText=clean(tr.find('.submissionStatus--score').text()),scores=scoreText.match(/([\d.-]+)\s*\/\s*([\d.-]+)/);
    const timeLimit=link.attr('data-time-limit')||link.attr('data-timed')||link.attr('data-time-limit-minutes');
    const template=link.attr('data-template-url');
    result.push({id:key,assignment_id:id||null,course_id:String(courseId),title,display_number:title.match(/(?:assignment|homework|hw|lab|quiz)\s*[:#]?\s*(\d+)/i)?.[1]||null,
      url:href?new URL(href,BASE).href:null,submission_id:href?.match(/submissions\/(\d+)/)?.[1]||null,
      submission_status:scores?'graded':clean(tr.find('.submissionStatus--text').text())||'unknown',score:scores?Number(scores[1]):null,max_score:scores?Number(scores[2]):null,
      release_at:dateValue(release?.raw),due_at:dateValue(due?.raw),late_due_at:dateValue(late?.raw),dates,timezone_label:clean(table.find('thead abbr').attr('title')||''),
      submission_format:link.attr('data-submission-format')||null,timed:!!timeLimit,availability:href?'viewable':id?'submission_dialog':'unlinked',
      attachments:template?[{url:template,title:'Assignment template',role:'assignment_template'}]:[],coverage:{metadata:id?'complete':'partial',reason:id?null:'No stable assignment link exposed'}});
  });
  return result;
}
export function components(html) {
  const $=load(html),out=[];
  $('[data-react-class][data-react-props]').each((_,e)=>{
    try {out.push({name:$(e).attr('data-react-class'),data:JSON.parse($(e).attr('data-react-props'))});}catch{}
  });return out;
}
export function collectFiles(value,role='attachment',out=[]) {
  if(!value)return out;
  if(typeof value==='string'){
    const $=load(value);const candidates=[];
    $('[href],[src]').each((_,e)=>candidates.push($(e).attr('href')||$(e).attr('src')));
    for(const m of value.matchAll(/https?:\/\/[^\s"'<>\)]+/gi))candidates.push(m[0].replaceAll('&amp;','&'));
    for(const url of candidates)if(/\.(pdf|png|jpg|jpeg|gif|webp|zip|txt|csv|docx|xlsx|py|m|ipynb)(?:\?|$)/i.test(url))out.push({url:new URL(url,BASE).href,title:'Linked file',role});
    return out;
  }
  if(Array.isArray(value)){for(const v of value)collectFiles(v,role,out);return out;}
  if(typeof value==='object'){
    for(const [k,v] of Object.entries(value)){
      if(typeof v==='string' && /^https?:\/\//.test(v) && /\.(pdf|png|jpg|jpeg|gif|webp|zip|txt|csv|docx|xlsx|py|m|ipynb)(?:\?|$)/i.test(v))out.push({url:v,title:value.filename||value.name||k,role});
      else if(v&&(typeof v==='object'||typeof v==='string'))collectFiles(v,role,out);
    }
  }
  return out;
}
export function htmlText(html){const $=load(String(html||''));$('script,style').remove();return $.text().trim();}
