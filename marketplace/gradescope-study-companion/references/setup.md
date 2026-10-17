# Setup and recovery

## Requirements and verified scope

macOS, Node.js 22.13+, Google Chrome, Poppler (`pdftotext`, `pdftoppm` on PATH). Tesseract is optional for OCR. The skill format is portable; the runtime is a macOS preview. Generic STDIO transport is tested. Individual Claude Code, Cursor, and Copilot UI installations are not certified by this release. Linux, Windows, mobile-only and cloud-only execution are unsupported.

Unzip into a folder named `gradescope-study-companion` in your agent's documented skills directory. The archive has SKILL.md at its root, so create the destination folder before extraction. Keep it at a stable path. The bundled runtime is copied from the same reviewed repository source; it is not a remote install script.

From this skill's `runtime` directory:

```sh
node scripts/doctor.mjs
npm ci
node scripts/doctor.mjs
npm test
node scripts/configure.mjs
```

The first doctor run may report missing npm dependencies. It only checks prerequisites; it never reads account data or opens Keychain. Install missing prerequisites yourself or ask your agent to help. `npm ci` fetches dependencies from the npm registry. On Homebrew systems, `brew install node poppler` installs the main command-line prerequisites; install Chrome separately. No global package installation or host-config overwrite is required by this package.

The config generator creates `.mcp.json` in `runtime` with absolute paths for this machine. Copy its `gradescope` server entry into your client's documented STDIO MCP settings, preserving other entries. For clients whose schema differs, map the command, args and env fields to their documented format. Never claim registration succeeded until the client lists all 12 tools.

Codex CLI can register directly from the runtime directory:

```sh
codex mcp add gradescope --env NODE_NO_WARNINGS=1 --env "PATH=$PATH" -- "$(command -v node)" "$PWD/src/server.mjs"
```

Use one Gradescop server registration, not duplicates from both plugin and manual MCP setup. Restart/reconnect the client, then use `connection_status`. For first live access, run `npm run connect` from runtime or call the `connect` tool and complete browser login yourself. Institutional SSO/MFA may require interaction; unsupported flows must not be bypassed. Run `sync`, wait for terminal `sync_status`, inspect failures and coverage, then query courses. Having a session saved is not proof of a successful current login.

If tools are unavailable, the CLI supports `status`, `connect`, `sync`, and `job JOB_ID`; it does not offer every query tool. Do not invent CLI query commands or read the database directly to work around missing tools. Reconnect the STDIO server.

## Upgrade and removal

Stop the server before replacing the skill folder. Keep the previous package until the new one passes doctor and tests. Do not overwrite a configured runtime in place while it is running. Re-run configure if the path changed, then update only this server's registration. Removing the skill and server registration leaves the private archive intact. Deleting coursework or Keychain entries is a separate user decision; this package has no automatic data deletion.

## Offline proof

`npm test` exercises synthetic parsing, real PDF text extraction, isolated archives and JSON-RPC MCP reads without login. Tests do not establish that a particular institution's live site works. Original runtime documentation, license, and synthetic tests are bundled for review.
