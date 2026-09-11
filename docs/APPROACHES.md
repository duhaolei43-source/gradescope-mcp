# Existing approaches and design decisions

Reviewed September 11, 2026. These are comparisons of published project documentation, not independent audits of their runtime behavior. No source code was copied from these projects.

| Project | Published approach | Lesson for Gradescop |
| --- | --- | --- |
| [Yuanpeng-Li/gradescope-mcp](https://github.com/Yuanpeng-Li/gradescope-mcp) | Python MCP for instructors/TAs, grading tools and explicit confirmation for writes; environment credentials | Separate access roles and retrieve relevant question pages. Gradescop exposes student reads only and uses interactive login. |
| [Teaching-and-Learning-in-Computing/Gradescope](https://github.com/Teaching-and-Learning-in-Computing/Gradescope) | Python wrapper with course/assignment/member entities, historical submissions, JSON/CSV and downloads | Keep a structured adapter and preserve submission history instead of only current scores. |
| [aryankeluskar/canvas-mcp](https://github.com/aryankeluskar/canvas-mcp) | Combined Canvas and Gradescope MCP, local and hosted configuration | Provide clear client configuration. Start with one local account and one platform before adding a hosted service. |

[Gradescope's own API guidance](https://guides.gradescope.com/hc/en-us/articles/36028522325901-Gradescope-Public-API) says it does not offer a public API. Consequently this adapter uses authenticated student web views and must detect incomplete coverage instead of assuming a stable public API contract.

Architecture: interactive Chrome sign-in → encrypted local session → authenticated student HTML and viewer metadata → normalized SQLite records and content-addressed files → paginated STDIO MCP tools → Codex workflow skill. Sync parsing and PDF extraction run locally without an LLM call; relevant excerpts are fetched on demand.

Codex packaging follows the installed official plugin-creator skill: compatibility plugin manifest, separate MCP configuration, workflow skill and marketplace registration. Generic STDIO setup is available now; portable one-step marketplace distribution remains on the roadmap.
