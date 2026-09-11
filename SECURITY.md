# Security

Never attach passwords, cookies, session files, signed download URLs, real student work or grade exports to issues. Reproduce problems with synthetic HTML/JSON. For vulnerabilities that could expose account data, use GitHub private vulnerability reporting when available; otherwise request a private contact channel without posting exploit details publicly.

This preview uses macOS Keychain for the session encryption key. Local archive metadata and downloaded coursework are not application-encrypted. Anyone with access to your OS account may be able to access them. A custom GRADESCOPE_DATA_DIR must be outside the checkout. Session expiration requires interactive login.

Uninstalling MCP or the plugin does not erase the archive or Keychain entry. Remove personal data separately if desired. No CI workflow needs Gradescope credentials.
