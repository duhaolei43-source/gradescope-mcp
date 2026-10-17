import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnose} from '../scripts/doctor.mjs';
const available={platform:'darwin',version:'22.13.0',exists:()=>true,run:()=>({status:0}),resolve:x=>x};
test('doctor reports unsupported platform and old Node without accessing account state',()=>{
 const r=diagnose({...available,platform:'linux',version:'22.12.0'});
 assert.equal(r.status,'needs_setup');assert.equal(r.checks.find(c=>c.name==='macOS').ok,false);assert.equal(r.checks.find(c=>c.name==='Node.js').ok,false);assert.equal(r.live_login_verified,false);
});
test('optional OCR does not block setup; missing runtime dependency does',()=>{
 assert.equal(diagnose({...available,run:n=>({status:n==='tesseract'?1:0})}).status,'ready');
 assert.equal(diagnose({...available,resolve:()=>{throw Error('missing');}}).status,'needs_setup');
});
