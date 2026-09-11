import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gradescop-cli-test-'));
const cli=fileURLToPath(new URL('../src/cli.mjs',import.meta.url));
function run(command){const r=spawnSync(process.execPath,[cli,command],{cwd:os.tmpdir(),env:{...process.env,GRADESCOPE_DATA_DIR:dir,NODE_NO_WARNINGS:'1'},encoding:'utf8',timeout:10000});assert.equal(r.error,undefined);return {code:r.status,value:JSON.parse(r.stdout)};}
test('fresh status works without credentials or browser',()=>{const r=run('status');assert.equal(r.code,0);assert.equal(r.value.connection,null);});
test('unknown command produces a compact failure',()=>{const r=run('unknown');assert.equal(r.code,1);assert.equal(r.value.error,'UNKNOWN_COMMAND');});
test('sync without session fails promptly and persists failed job without launching Chrome',()=>{const r=run('sync');assert.equal(r.code,1);assert.equal(r.value.error,'AUTHENTICATION_REQUIRED');assert.equal(r.value.status,'failed');const job=JSON.parse(fs.readFileSync(path.join(dir,'jobs',r.value.id+'.json')));assert.equal(job.status,'failed');assert.equal(fs.existsSync(path.join(dir,'browser.lock')),false);});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
