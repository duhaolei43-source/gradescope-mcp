# Release validation

The pre-release baseline passed 18 runtime tests. This branch adds setup diagnostics and coverage regression tests, bringing the runtime suite to 22 tests. Packaging has three additional tests for reproducibility/root layout, malformed metadata, and rejection of private paths/symlinks.

Reproduce from the repository:

```sh
npm ci
npm test
python3 scripts/test_package.py
npm run package:skill
python3 scripts/verify_skill.py
```

The final command inspects the actual ZIP, verifies each manifest hash and relative Markdown link, extracts to a temporary location, installs from the lockfile, runs doctor and the 22 runtime tests, and validates that generated MCP configuration points to the extracted runtime. It does not sign in or read a private archive. It needs npm network access and macOS prerequisites. The ZIP builder does not require installed node_modules and includes only explicitly enumerated files.

The skill frontmatter also passed the Codex skill-creator validator during release preparation. CI builds on macOS with Node 22 and 24; inspect the branch workflow result before calling that run successful. Local tests do not certify each client UI, live SSO, OCR accuracy or all Gradescope layouts. A targeted artifact scan is not a substitute for Agensi's security review.

The external SHA-256 companion file identifies the exact archive bytes. MANIFEST.json identifies each contained file. No live data, credentials, generated host configuration, compiled dependencies or private recovery notes belong in the artifact.
