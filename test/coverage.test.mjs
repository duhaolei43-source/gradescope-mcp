import test from 'node:test';
import assert from 'node:assert/strict';
import {completeCoverage,materialFailures} from '../src/coverage.mjs';
test('missing requested course or assignment cannot certify refresh success',()=>{
 const course={courses:0,assignments:0,failures:[]};
 assert.equal(completeCoverage(course,{course_id:'missing'}),'partial');
 assert.equal(course.failures[0].error,'COURSE_NOT_DISCOVERED');
 const assignment={courses:1,assignments:0,failures:[]};
 assert.equal(completeCoverage(assignment,{assignment_id:'missing'}),'partial');
 assert.equal(assignment.failures[0].error,'ASSIGNMENT_NOT_DISCOVERED');
 assert.equal(completeCoverage({courses:1,assignments:0,failures:[]},{course_id:'empty-course'}),'complete');
});
test('failed and external templates mark a run partial without retaining signed URLs',()=>{
 const failures=materialFailures({id:'demo',attachments:[{id:'ok',status:'downloaded'},{id:'bad',status:'failed',error:'DOWNLOAD_FAILED',source_url:'https://example.test?signature=secret'},{status:'external_access_required'}]});
 assert.equal(failures.length,2);assert.equal(failures[1].error,'EXTERNAL_ACCESS_REQUIRED');assert.equal(JSON.stringify(failures).includes('signature'),false);
 assert.equal(completeCoverage({courses:1,assignments:1,failures}),'partial');
});
