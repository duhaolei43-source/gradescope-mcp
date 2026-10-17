# Agensi release plan and completion assessment

Assessment date: 2026-10-17. Baseline: aeaf12ec43590575a9984f144fb9620aab526122. Publication branch: feat/agensi-skill-release.

## Stage at intake

The public project was an operational 0.1 macOS preview, not a concept. Three commits published the student reader, expanded smoke coverage/presentation, then clarified MCP discovery metadata. Twelve tools expose local archived course, assignment, submission, feedback and document data. Baseline lockfile installation and all 18 tests passed during this review. The latest baseline GitHub run also succeeded: https://github.com/duhaolei43-source/gradescope-mcp/actions/runs/34629886176 .

Strengths to preserve: interactive Chrome authentication, Keychain-backed encrypted sessions, SQLite shared archive, complete original files, page extraction and optional OCR, normalized scoring direction, async sync jobs, explicit retrieval coverage, read-only student scope and synthetic-only public tests. The existing Codex plugin remains available.

Missing publication layer: portable outcome-focused skill, self-contained runtime distribution, setup diagnostics, buyer-facing privacy/compatibility explanation, deterministic ZIP and proof of a fresh extraction. A skill alone cannot replace the MCP connection. Runtime support remains macOS; installation in every agent and institution is not established.

## Implementation and acceptance gates

| Priority | Work | Acceptance | Result |
| --- | --- | --- | --- |
| P0 | Preserve core | Same 12-tool protocol, no assessment mutations | Preserved; MCP integration tests |
| P0 | Freshness correctness | Requested missing scope and failed templates cannot report complete | Fixed, regression tests |
| P0 | Private distribution | Explicit source allowlist; no archive, sessions, node_modules or local config | Builder and negative tests |
| P0 | Portable entrypoint | Root SKILL.md, valid name/description, linked resources | Validated |
| P1 | Setup experience | Diagnose platform, runtime, dependencies and PDF tools without account access | Implemented and tested |
| P1 | Student outcomes | Deadline brief, applied-rubric explanation, materials and changes | Skill and workflow references |
| P1 | Credible proof | Synthetic example tied to runnable MCP/PDF tests | Included; no live-account claim |
| P1 | Reproducible delivery | Deterministic ZIP, manifest hashes, fresh extraction test | Implemented; see VALIDATION.md |
| P1 | Listing readiness | Free launch copy, requirements, limitations and upload steps | LISTING.md |
| P2 | CI packaging | Build/test ZIP on existing macOS Node matrix | Workflow added |

## Why this scope

The research in MARKET_RESEARCH.md supports concrete deliverables, source traceability, clear setup and honest dependencies. Launch free: the current audience faces macOS setup friction and the underlying code is already MIT-licensed. This is a launch choice, not a claim that paid skills cannot succeed. Do not promise traffic, revenue, approval, or installation across 20+ agents.

## Deferred engineering, not hidden release claims

Windows/Linux credential stores, fully bounded streaming downloads, resumable sync, structured before/after deltas, all-institution SSO tests, client-specific installation certification, and one-command Codex marketplace registration remain roadmap work. These are not advertised features of this preview. Agensi security/manual review and actual upload remain external steps. No scheduler is installed or re-enabled.
