import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {ROOT,hash,atomic,get,put,now} from './storage.mjs';
import {BASE,safeUrl} from './parsers.mjs';
const exec=promisify(execFile);
export function allowedFile(value) {
  try {const u=new URL(value,BASE);return u.protocol==='https:'&&(u.hostname==='www.gradescope.com'||/^production-gradescope-uploads\.s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(u.hostname));}catch{return false;}
}
export async function download(context,item,assignment) {
  if(!allowedFile(item.url))return {status:'external_access_required',source_url:safeUrl(item.url),role:item.role};
  const source=safeUrl(item.url),id=hash(`${assignment.id}|${item.role}|${source}`).slice(0,24);
  try {
    let r, url=item.url;
    for(let redirects=0;redirects<6;redirects++){
      if(!allowedFile(url))throw Error('DOWNLOAD_REDIRECT_NOT_ALLOWED');
      r=await context.request.get(url,{timeout:60000,maxRedirects:0});
      if([301,302,303,307,308].includes(r.status())){
        const next=r.headers().location;if(!next)throw Error('INVALID_REDIRECT');
        url=new URL(next,url).href;continue;
      }
      break;
    }
    if(!r.ok())throw Error(`DOWNLOAD_HTTP_${r.status()}`);
    if(!allowedFile(r.url()))throw Error('DOWNLOAD_REDIRECT_NOT_ALLOWED');
    const buffer=await r.body();
    if(buffer.length>100*1024*1024)throw Error('DOCUMENT_EXCEEDS_100MB');
    const isPdf=buffer.subarray(0,5).toString()==='%PDF-';
    const type=r.headers()['content-type']||'';
    if(type.includes('text/html')||(!isPdf&&/\.pdf$/i.test(source)))throw Error('EXPECTED_FILE_RECEIVED_HTML');
    const sha=hash(buffer),extension=isPdf?'.pdf':path.extname(new URL(source).pathname).slice(0,12)||'.bin';
    const file=path.join(ROOT,'files',sha+extension),previous=get('document',id);
    if(!fs.existsSync(file))atomic(file,buffer);
    let pages=previous?.sha256===sha?previous.pages:undefined,extraction=previous?.sha256===sha?previous.extraction:undefined;
    if(!pages && isPdf){
      try {
        const {stdout}=await exec('pdftotext',['-layout',file,'-'],{maxBuffer:20*1024*1024,timeout:60000});
        pages=stdout.split('\f');if(pages.at(-1)==='')pages.pop();
        extraction=pages.some(p=>p.trim().length<20)?'text_with_image_pages':'text';
      }catch{pages=[];extraction='extraction_failed';}
    }else if(!pages && /text\//.test(type)){pages=[buffer.toString('utf8')];extraction='text';}
    else if(!pages){pages=[];extraction='binary_or_image';}
    const doc={id,course_id:assignment.course_id,assignment_id:assignment.id,title:item.title||path.basename(new URL(source).pathname),role:item.role,source_url:source,path:file,sha256:sha,bytes:buffer.length,mime_type:type,pages,extraction,page_count:pages.length||null,fetched_at:now(),status:'downloaded'};
    put('document',id,doc,pages.join('\n'));
    return {id,status:'downloaded',role:item.role,title:doc.title,bytes:doc.bytes,page_count:doc.page_count,extraction};
  }catch(e){return {id,status:'failed',role:item.role,source_url:source,error:/^[A-Z_0-9]+$/.test(e.message)?e.message:'DOWNLOAD_FAILED'};}
}
export async function readDocument(id,{page=1,page_count=3,ocr=false}={}) {
  const d=get('document',id);if(!d)throw Error('DOCUMENT_NOT_FOUND');
  let text=d.pages.slice(page-1,page-1+page_count);
  if(ocr && d.path.endsWith('.pdf')) {
    for(let i=page;i<page+page_count && i<=(d.page_count||page);i++){
      const prefix=path.join(ROOT,'pages',`${d.sha256}-${i}`),png=prefix+'.png',txt=prefix+'.txt';
      if(!fs.existsSync(png))await exec('pdftoppm',['-f',String(i),'-l',String(i),'-scale-to','2200','-singlefile','-png',d.path,prefix],{timeout:60000});
      if(!fs.existsSync(txt))await exec('tesseract',[png,prefix],{timeout:60000});
      text[i-page]=fs.readFileSync(txt,'utf8');
    }
  }
  return {id,title:d.title,path:d.path,source_url:d.source_url,page_count:d.page_count,start_page:page,next_page:page+page_count<=(d.page_count||0)?page+page_count:null,extraction:ocr?'OCR_unverified':d.extraction,pages:text.map((t,i)=>({page:page+i,text:t})),fetched_at:d.fetched_at};
}
