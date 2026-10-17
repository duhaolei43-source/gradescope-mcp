# Agensi submission copy

## Fields

- Title: Gradescope Study Companion
- Skill name: gradescope-study-companion
- Price: Free ($0)
- Category: Education & Learning (Productivity is a suitable secondary category if offered)
- Tags: gradescope, assignments, deadlines, rubric-feedback, mcp, student, macos
- Artifact: dist/gradescope-study-companion.zip
- Source: https://github.com/duhaolei43-source/gradescope-mcp
- License: MIT

## Short description

Check Gradescope deadlines, understand released rubric feedback, and see what changed—with source evidence. Includes the local Gradescop MCP runtime. macOS setup and your own interactive login required.

## Full description

Gradescope Study Companion connects a focused student workflow to Gradescop's local, read-only MCP server. Ask what is due, inspect an assignment's PDFs, understand released comments and applied rubric deductions, or summarize changes since the previous full sync.

The skill checks freshness, follows pagination, preserves exact due dates, and reports missing or partial coverage. It distinguishes instructor feedback from suggested study actions and marks OCR as unverified. It never submits work, starts a timed assessment, changes answers or sends regrade requests.

Included: SKILL.md, setup/recovery guide, workflow and privacy references, a synthetic worked example, the MIT-licensed MCP source, pinned npm lockfile, synthetic tests, and a file-hash manifest. No account data is included. Installation does not create a daily task.

Requirements: macOS, Node.js 22.13+, Google Chrome, Poppler, and a local client able to run a STDIO MCP server. Tesseract is optional. Install npm dependencies, register the server, then sign in privately in Chrome. The skill format is portable; live runtime support is currently a macOS preview. Claude Code, Cursor and Copilot installations are not individually certified. Cloud-only chats cannot run this local server.

Session state is encrypted using macOS Keychain. Coursework files stay in a private local archive but are not application-encrypted. Requested excerpts are sent into your agent conversation, subject to its provider's settings. Reads may record a view on Gradescope. Hidden grades, unstarted timed content, all SSO providers and every assignment layout are not guaranteed. Download size checks without Content-Length occur after buffering.

Independent project, not affiliated with Gradescope, Turnitin, OpenAI or Agensi. Free preview; no approval or security certification claimed before marketplace review.

## Example prompts

- Refresh Gradescope and show unsubmitted work due in the next seven days, with timezone and verification time.
- Explain the applied rubric deductions on this assignment and cite the instructor comments.
- Show the assignment PDF pages relevant to question 3.
- Refresh all courses, including older terms, and tell me what changed since the previous full sync.

## Reviewer notes

The runtime uses Chrome for private interactive login and authorized account-visible retrieval, plus local PDF tools. Installation uses the npm registry; the runtime contacts Gradescope/approved upload hosts, and SSO may visit the institutional provider. No credentials are accepted through skill frontmatter or chat. Review `references/privacy.md`, `runtime/SECURITY.md`, and the source. Run `npm ci` and `npm test` in runtime without a Gradescope account. The tests are synthetic; they are not claims of live cross-institution coverage.

## Upload handoff

1. Sign in at https://www.agensi.io/sell and open Submit a Skill.
2. Upload the ZIP above (SKILL.md is at the archive root).
3. Paste the title, short/full descriptions, choose free, and select suitable categories/tags supported by the actual form.
4. Keep the macOS/runtime requirements visible. Do not select unverified platform certifications.
5. Submit for marketplace review. The seller page currently quotes 24–48 hours, not a guarantee.

The package is prepared for upload. No account login, upload, payment configuration or submission has been performed by this release preparation.
