# Smoke testing and verification

## Run locally

Install Node 22.13+ and Poppler, then run:

```sh
npm ci
npm run smoke
```

No Gradescope credentials are used. Tests create temporary private archives, generate their own sample PDF and remove test data afterward. macOS CI exercises Node 22 and 24. This is a macOS preview; Linux/Windows are not advertised as supported.

| Area | Verification |
| --- | --- |
| Clean setup | Lockfile install, local config generator, manifest validation |
| CLI | Empty status, invalid command, no-session sync failure and lock cleanup |
| MCP transport | Initialization and tool inventory in two working directories |
| MCP reads | Seeded course/assignment pagination, date/status filtering, submissions, applied/full rubrics, annotations, document pages, search and changes |
| Errors | Missing assignment/document, mismatched submission, invalid page input |
| Parsing | Late deadlines, timezone offsets, old courses, missing layouts and expired login |
| Scoring | Negative scoring and hidden rubric suppression |
| Files | Generated PDF bytes, actual Poppler extraction, private permissions, unchanged-download detection |
| Boundaries | Redirect host validation, external hosts, HTML mistaken for PDF, declared size limit |
| Storage | Stable changes and browser exclusion lock |

## Honest limits

Synthetic tests cannot establish compatibility with every live Gradescope assignment, institution SSO flow, annotation layout or browser update. The first adapter received live validation during development; public CI deliberately has no real account. Interactive login, OCR accuracy, every historical attempt format and end-to-end live sync are not exhaustively tested here. The response body size fallback is checked after buffering when a server omits Content-Length; streaming bounds remain roadmap work.

For an optional manual live check, use your own account locally. Run connect and sync, verify coverage, compare a known deadline, original PDF and released feedback against the site, then repeat sync and inspect changes. Never upload the resulting archive or screenshots to CI or issues. Opening graded work can record a view.

## Visual review

The README banner is a self-contained SVG with accessible title/description. The architecture uses GitHub-supported Mermaid. All examples use synthetic descriptions; there are no real grades or student names in presentation assets.
