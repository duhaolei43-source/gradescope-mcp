# Data and permissions

The local runtime contacts www.gradescope.com and approved Gradescope S3 upload hosts for account-visible content. Interactive login can visit the student's institutional identity provider. npm contacts the configured package registry during dependency installation. The runtime has no marketplace telemetry or creator upload endpoint.

Chrome handles interactive authentication. Session state is AES-256-GCM encrypted with a macOS Keychain key; passwords are not accepted as configuration. The local archive is normally ~/Library/Application Support/GradescopePersonal. Files use owner-only permissions. Coursework text and PDFs are not encrypted by the application; protect the OS account/disk. GRADESCOPE_DATA_DIR changes the archive location, not the Keychain account identity; it is not a multi-account isolation feature.

MCP reads return selected coursework into the calling agent conversation. That client's provider and retention settings apply. Neither "local runtime" nor "read-only" means content never enters an AI service. Only synthetic fixtures belong in public issues, tests, demonstrations, and release artifacts.

The adapter does not submit work, change grades, start assessments or send regrade requests. Read access can record a view. There is no guarantee of every institution's SSO, every assignment type, hidden grades, or unstarted timed content. Download content without Content-Length is currently bounded only after buffering; this is a documented preview limitation.
