import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseAssignments,parseCourses,scrub,dateValue} from '../src/parsers.mjs';
process.env.GRADESCOPE_DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'gradescope-test-'));
const {allowedFile}=await import('../src/documents.mjs');
const {put,get,acquireLock,db,ROOT}=await import('../src/storage.mjs');
const {normalizeFeedback}=await import('../src/sync.mjs');

test('preserves individual due and late timestamps and finds button-only assignments without clicking',()=>{
 const html=`<table id="assignments-student-table"><tbody><tr><th class="table--primaryLink"><button data-assignment-id="42" data-template-url="https://production-gradescope-uploads.s3-us-west-2.amazonaws.com/a.pdf?X-Amz-Signature=secret">HW 2</button></th><td><div class="submissionStatus--text">No Submission</div><time aria-label="Due at something" datetime="2026-09-10 23:59:00 -0500"></time><time aria-label="Late Due Date at something" datetime="2026-09-12 23:59:00 -0500"></time></td></tr></tbody></table>`;
 const [a]=parseAssignments(html,'1');assert.equal(a.id,'42');assert.equal(a.due_at,'2026-09-11T04:59:00.000Z');assert.equal(a.late_due_at,'2026-09-13T04:59:00.000Z');assert.equal(a.submission_id,null);assert.equal(a.attachments.length,1);
});
test('cannot silently treat a changed page or expired login as an empty assignment list',()=>{
 assert.throws(()=>parseAssignments('<html>different page</html>','1'),/UNRECOGNIZED/);
 assert.throws(()=>parseAssignments('<input id="session_password">','1'),/AUTHENTICATION/);
});
test('discovers older courses and flags institution-restricted courses',()=>{
 const courses=parseCourses('<a class="courseBox" data-loginrequired="true" href="/courses/123"><h3 class="courseBox--shortname">Old course</h3><div class="courseBox--assignments">50 assignments</div></a>');assert.equal(courses[0].expected_assignments,50);assert.equal(courses[0].access,'institution_login_required');
});
test('strips signed download credentials and session secrets from persisted evidence',()=>{
 const value=scrub({password:'secret',authenticity_token:'secret',title:'text',file:'https://example.com/file.pdf?X-Amz-Security-Token=secret'});assert.deepEqual(value,{title:'text',file:'https://example.com/file.pdf'});
});
test('rejects lookalike and local file download destinations',()=>{
 assert.equal(allowedFile('https://www.gradescope.com/a.pdf'),true);assert.equal(allowedFile('https://www.gradescope.com.evil.test/a.pdf'),false);assert.equal(allowedFile('file:///etc/passwd'),false);assert.equal(allowedFile('http://127.0.0.1/a.pdf'),false);
});
test('unchanged content does not create a change on every refresh',()=>{
 put('assignment','1',{title:'HW',fetched_at:'one'});put('assignment','1',{title:'HW',fetched_at:'two'});assert.equal(db.prepare('SELECT count(*) AS n FROM changes').get().n,1);assert.equal(get('assignment','1').fetched_at,'two');
});
test('two MCP processes cannot use the browser lock simultaneously',()=>{
 const release=acquireLock();assert.throws(()=>acquireLock(),/BROWSER_BUSY/);release();acquireLock()();
});
test('invalid timestamps remain unknown',()=>assert.equal(dateValue('invalid'),null));
test('negative-scoring rubric weights become deductions while bonus weights add points',()=>{
 const p={grades_visible:true,assignment_submission:{id:7,active:true},assignment:{},questions:[{id:1,index:1,title:'Q1',scoring_type:'negative',weight:'10'}],question_submissions:[{question_id:1,score:'8',evaluations:[],annotations:[]}],rubric_items:[{id:1,question_id:1,weight:'3',present:true},{id:2,question_id:1,weight:'-1',present:true}]};
 const s=normalizeFeedback(p,{id:'2',course_id:'3',url:'https://www.gradescope.com/',title:'Test'});assert.deepEqual(s.questions[0].rubric_items.map(r=>r.point_effect),[-3,1]);
 p.grades_visible=false;const hidden=normalizeFeedback(p,{id:'2',course_id:'3'});assert.equal(hidden.score,null);assert.deepEqual(hidden.questions[0].rubric_items,[]);
});
test.after(()=>{db.close();fs.rmSync(ROOT,{recursive:true,force:true});});
