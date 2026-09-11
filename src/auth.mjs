import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { ROOT, atomic, setting, now } from './storage.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const SERVICE='gradescope-personal-session-v1';
const FILE=path.join(ROOT,'session.enc');
function key(create=false) {
  try { return Buffer.from(execFileSync('/usr/bin/security',['find-generic-password','-a','local-session','-s',SERVICE,'-w'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(),'hex'); }
  catch {
    if(!create) throw new Error('AUTHENTICATION_REQUIRED');
    const k=crypto.randomBytes(32);
    execFileSync('/usr/bin/security',['-i'],{input:`add-generic-password -U -a local-session -s ${SERVICE} -w ${k.toString('hex')}\n`,stdio:['pipe','ignore','ignore']});
    return k;
  }
}
export function saveSession(state) {
  const iv=crypto.randomBytes(12), cipher=crypto.createCipheriv('aes-256-gcm',key(true),iv);
  const data=Buffer.concat([cipher.update(JSON.stringify(state),'utf8'),cipher.final()]);
  atomic(FILE,Buffer.concat([iv,cipher.getAuthTag(),data]));
  setting('session_saved_at',now());
}
export function loadSession() {
  if(!fs.existsSync(FILE)) throw new Error('AUTHENTICATION_REQUIRED');
  try {
    const b=fs.readFileSync(FILE), decipher=crypto.createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));
    decipher.setAuthTag(b.subarray(12,28));
    return JSON.parse(Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]).toString());
  } catch { throw new Error('AUTHENTICATION_REQUIRED'); }
}
export async function openBrowser({interactive=false}={}) {
  let state;
  try {state=loadSession();} catch(e) {if(!interactive)throw e;}
  const browser=await chromium.launch({channel:'chrome',headless:!interactive});
  const context=await browser.newContext({storageState:state,acceptDownloads:true});
  context.setDefaultTimeout(12000);
  return {browser,context};
}
export async function connect() {
  const {browser,context}=await openBrowser({interactive:true});
  try {
    const page=await context.newPage();
    await page.goto('https://www.gradescope.com/account');
    await page.waitForFunction(()=>location.pathname==='/account' && !!document.querySelector('a[href="/logout"],form[action="/logout"],.courseList,.courseBox'),{},{timeout:300000});
    saveSession(await context.storageState());
    setting('connection',{status:'connected',verified_at:now()});
    return {status:'connected'};
  } finally {await browser.close();}
}
