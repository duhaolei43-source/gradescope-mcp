# Synthetic walkthrough — not student account data

Request: "Show what is due in my demo course and explain the released feedback on Synthetic HW 1."

The bundled MCP tests seed three synthetic assignments and one graded submission, then exercise the real server over STDIO. Run `npm test` inside runtime to reproduce the assertions. This example explains that fixture; it is not a live Gradescope sync or an autonomous-agent evaluation.

| Assignment | Fixture status | Stored due timestamp |
| --- | --- | --- |
| Synthetic HW 1 | graded | 2026-12-01T00:00:00.000Z |
| Synthetic HW 2 | No Submission | 2026-12-02T00:00:00.000Z |
| Synthetic HW 3 | No Submission | 2026-12-03T00:00:00.000Z |

The test reads assignments in two pages (limit 2, then offset 2), checks that the graded filter returns one record, retrieves the submission, and checks applied versus full rubric output. Synthetic HW 1 has score 8/10, applied point_effect -2, comment "Check units", and annotation "Synthetic note". A second unapplied rubric item is included only in the full-rubric response and is not another deduction. The test also retrieves two document-text pages and verifies search/change results.

A suitable student-facing explanation would identify the applied -2-point effect and quote the instructor's units comment, while labeling a recommendation to review units as agent advice. The fixture's fetched_at is 2026-01-01; the answer must not call it fresh. Synthetic document paths are not real assignment PDFs. A separate generated-PDF test verifies actual Poppler extraction and original-byte preservation.
