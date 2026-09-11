# Public implementation plan

## 0.1 preview: available

- Student-only retrieval through 12 MCP tools; courses, assignments, exact dates, submissions, released grades, rubric details, annotations and document references.
- Shared local SQLite archive, original file preservation, page extraction, optional OCR, stable change detection, explicit coverage and failures.
- Interactive Chrome login and encrypted macOS Keychain-backed session. No password configuration.
- Machine-local configuration generator and generic Codex MCP setup; synthetic tests and public CI.

Evidence: the original local adapter was exercised on real student PDF and online assignment views, including past submissions and graded annotations. Private account examples are deliberately excluded. Automated tests exercise synthetic parsing, scoring direction, origin restrictions, locking and MCP responses. This is not validation of all institutions or assignment types.

## 0.2: reproducible plugin installation

Deliver a public marketplace package and idempotent installer with dependency checks, safe upgrade/uninstall and stable source paths. Acceptance: a fresh macOS account can install, see Gradescop in the + picker, sign in interactively and read a synthetic fixture without editing absolute paths. Preserve existing Codex configuration and avoid duplicate MCP registrations.

## 0.3: coverage and reliability

Add synthetic fixtures for more assignment types, SSO expiration, redirects, missing materials, historical attempts and annotation layouts. Add structured before/after change summaries and resumable sync. Acceptance: no silently successful partial crawls, deadline offsets preserved, downloads bounded while streaming, and failed individual items retried without downloading unchanged files.

## 0.4: platform portability

Introduce explicit OS credential-store backends for Windows and Linux, test permissions and browser selection, and establish a supported runtime matrix. Never fall back silently to a plaintext session. Acceptance: fresh-machine tests on each advertised platform and independent security review of credential storage.

## Ongoing privacy and maintenance

Use only synthetic fixtures in CI; never upload private PDFs, cookies, snapshots or account exports. Keep authentication interactive. Document unsupported views and dependency updates. Any future multi-account or hosted mode requires explicit account isolation, authorization and retention design before implementation. Do not add submission/grading mutations to this student reader.

## Release criteria

A clean clone installs from its lockfile; tests pass; generated paths are ignored; only intended source/docs are tracked; no private identifiers, coursework or sessions are present; source links and limitations are accurate. Publish preview source without claiming curated Codex marketplace approval, official Gradescope support, or production completeness.
