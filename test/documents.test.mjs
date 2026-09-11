import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
process.env.GRADESCOPE_DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'gradescop-doc-test-'));
const {download,readDocument}=await import('../src/documents.mjs');
const {db,ROOT,get}=await import('../src/storage.mjs');
const assignment={id:'synthetic',course_id:'demo'};
function response(url,body,headers={},status=200){return {url:()=>url,body:async()=>Buffer.from(body),headers:()=>headers,status:()=>status,ok:()=>status>=200&&status<300};}
function context(handler){return {request:{get:handler}};}
const url='https://www.gradescope.com/synthetic.pdf';
function pdf(){
 const stream='BT /F1 18 Tf 50 100 Td (Synthetic Gradescop smoke document) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let out='%PDF-1.4\n';const offsets=[0];for(const [i,obj] of objects.entries()){offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${obj}\nendobj\n`;}
 const start=Buffer.byteLength(out);out+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');return out+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
}
test('PDF download preserves bytes, extracts text, redacts signed URL and reuses content',async()=>{
 assert.equal(spawnSync('pdftotext',['-v']).status,0,'Install Poppler before running the document smoke suite');
 const body=pdf(),ctx=context(async()=>response(url,body,{'content-type':'application/pdf'}));
 const a=await download(ctx,{url:url+'?signature=synthetic',role:'template'},assignment);
 assert.equal(a.status,'downloaded');assert.equal(a.page_count,1);assert.equal(a.extraction,'text');
 const d=get('document',a.id);assert.equal(fs.readFileSync(d.path,'utf8'),body);assert.equal(d.source_url,url);assert.equal(fs.statSync(d.path).mode&0o777,0o600);
 const read=await readDocument(a.id,{});assert.match(read.pages[0].text,/Synthetic Gradescop/);assert.equal(read.next_page,null);
 const before=db.prepare('SELECT count(*) n FROM changes').get().n;
 await download(ctx,{url:url+'?signature=rotated',role:'template'},assignment);
 assert.equal(db.prepare('SELECT count(*) n FROM changes').get().n,before);
});
test('redirect to an unapproved host is rejected without requesting that host',async()=>{
 const calls=[];const result=await download(context(async(u,opts)=>{calls.push(u);assert.equal(opts.maxRedirects,0);return response(u,'',{location:'https://evil.test/a.pdf'},302);}),{url,role:'redirect'},assignment);
 assert.equal(result.error,'DOWNLOAD_REDIRECT_NOT_ALLOWED');assert.deepEqual(calls,[url]);
});
test('HTML masquerading as PDF and declared oversized files fail explicitly',async()=>{
 const html=await download(context(async()=>response(url,'<html>login</html>',{'content-type':'text/html'})),{url,role:'html'},assignment);
 assert.equal(html.error,'EXPECTED_FILE_RECEIVED_HTML');
 let read=false;const big=await download(context(async()=>({...response(url,'',{'content-length':String(101*1024*1024)}),body:async()=>{read=true;return Buffer.alloc(0);}})),{url,role:'big'},assignment);
 assert.equal(big.error,'DOCUMENT_EXCEEDS_100MB');assert.equal(read,false);
});
test('missing document and external destination remain explicit',async()=>{
 await assert.rejects(readDocument('missing'),/DOCUMENT_NOT_FOUND/);
 const r=await download(context(()=>{throw Error('must not request');}),{url:'https://example.com/a.pdf',role:'external'},assignment);assert.equal(r.status,'external_access_required');
});
test.after(()=>{db.close();fs.rmSync(ROOT,{recursive:true,force:true});});
