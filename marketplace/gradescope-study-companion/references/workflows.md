# Output contracts and failure recovery

## Deadline brief

Include a scope/freshness sentence and rows: Course | Assignment | Status | Due (timezone) | Time left | Source. Separate overdue unsubmitted, upcoming unsubmitted, submitted, and unknown deadlines as relevant. Do not equate overdue with accepting late submissions; show a separate visible late deadline when present. A due-window filter omits undated work, so retrieve the unfiltered scope as well when completeness matters.

## Feedback review

Include the released score only if visible. Use rows: Question | Applied point effect | Instructor evidence | Suggested next step. A negative-scoring rubric can store positive raw weights for deductions: rely on normalized point_effect. Preserve full comments/annotations, paginate all questions, and flag missing PDF/OCR coverage. Advice must not be represented as the instructor's wording.

## Change digest

Retain the previous full-sync timestamp before starting. Paginate changes after completion. Group by assignment; verify fields in current records. If no previous values were retained, say "record updated; current score ..." rather than inventing an old score. If a full run is partial, report affected items and optionally retry only those items; a targeted retry does not automatically certify a new full-account snapshot.

## Recovery

- AUTHENTICATION_REQUIRED: request private interactive login; retain cached data with its timestamp.
- BROWSER_BUSY / already_running: allow the current operation to finish; verify its scope before reuse.
- SUBMISSION_PARTIAL / RETRIEVAL_FAILED: identify the affected assignment and missing pieces; a targeted sync may recover them. Do not retry indefinitely.
- External file host rejected: report external_access_required. Do not broaden the allowlist automatically.
- Extraction failed / scanned PDF: use a local PDF viewer or optional OCR and explicitly mark uncertainty.
- Missing tools / unsupported OS: explain setup requirements; do not fabricate a digest.
- No changes with incomplete coverage: report the coverage failure, not "everything is up to date."
