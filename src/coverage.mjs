// Final coverage classification shared by sync and synthetic regression tests.
export function completeCoverage(state, {course_id, assignment_id} = {}) {
  if (course_id && state.courses === 0)
    state.failures.push({course_id: String(course_id), error: 'COURSE_NOT_DISCOVERED'});
  if (assignment_id && state.assignments === 0)
    state.failures.push({assignment_id: String(assignment_id), error: 'ASSIGNMENT_NOT_DISCOVERED'});
  return state.failures.length ? 'partial' : 'complete';
}
export function materialFailures(assignment) {
  return assignment.attachments.filter(d => d.status !== 'downloaded').map(d => ({
    assignment_id: assignment.id, document_id: d.id || null,
    error: d.error || (d.status === 'external_access_required' ? 'EXTERNAL_ACCESS_REQUIRED' : 'MATERIAL_RETRIEVAL_FAILED')
  }));
}
