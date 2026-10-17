#!/usr/bin/env python3
"""Build a deterministic, allowlisted marketplace ZIP; never walk private archives."""
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / 'marketplace/gradescope-study-companion'
# Explicit reviewed paths. New files must be intentionally added here.
SKILL_FILES = ['SKILL.md', 'references/setup.md', 'references/workflows.md',
               'references/privacy.md', 'examples/walkthrough.md']
RUNTIME_FILES = ['package.json', 'package-lock.json', 'LICENSE', 'README.md',
                 'SECURITY.md', 'ROADMAP.md', 'CONTRIBUTING.md', 'CHANGELOG.md',
                 'docs/TESTING.md', 'docs/APPROACHES.md',
                 'docs/release/PLAN.md', 'docs/release/MARKET_RESEARCH.md',
                 'docs/release/LISTING.md', 'docs/release/VALIDATION.md',
                 'assets/banner.svg', 'assets/icon.svg',
                 '.codex-plugin/plugin.json', 'skills/gradescope/SKILL.md',
                 'src/auth.mjs', 'src/cli.mjs', 'src/documents.mjs', 'src/parsers.mjs',
                 'src/server.mjs', 'src/storage.mjs', 'src/sync.mjs', 'src/coverage.mjs',
                 'scripts/configure.mjs', 'scripts/doctor.mjs',
                 'test/core.test.mjs', 'test/cli.test.mjs', 'test/documents.test.mjs',
                 'test/mcp.test.mjs', 'test/doctor.test.mjs', 'test/coverage.test.mjs']

def validate_frontmatter(text):
    match = re.match(r'\A---\nname: ([a-z0-9-]{1,64})\ndescription: ([^\n]+)\n---\n', text)
    if not match or match[1] != SKILL.name or len(match[2]) > 1024:
        raise ValueError('Invalid required skill frontmatter')

def payload():
    entries = {}
    for source, target in [(SKILL / f, f) for f in SKILL_FILES] + [(ROOT / f, 'runtime/' + f) for f in RUNTIME_FILES] + [(ROOT / 'LICENSE', 'LICENSE')]:
        if source.is_symlink() or not source.is_file():
            raise ValueError('Missing or symlinked release source: ' + target)
        data = source.read_bytes()
        # Targeted public-artifact checks, not a claim of comprehensive secret detection.
        for pattern in [rb'/Users/[^/\s]+/', rb'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----', rb'gh[pousr]_[A-Za-z0-9]{30,}', rb'github_pat_[A-Za-z0-9_]{30,}']:
            if re.search(pattern, data):
                raise ValueError('Potential private material in ' + target)
        entries[target] = data
    validate_frontmatter(entries['SKILL.md'].decode())
    entries['runtime/README.md'] = entries['runtime/README.md'].replace(b'(marketplace/gradescope-study-companion/SKILL.md)', b'(../SKILL.md)')
    # Package is a runtime distribution, not a recursive build workspace.
    pkg = json.loads(entries['runtime/package.json'])
    pkg['scripts'].pop('package:skill', None)
    entries['runtime/package.json'] = (json.dumps(pkg, indent=2) + '\n').encode()
    hashes = {name: hashlib.sha256(data).hexdigest() for name, data in sorted(entries.items())}
    entries['MANIFEST.json'] = (json.dumps({'format': 1, 'skill': SKILL.name, 'files': hashes}, indent=2) + '\n').encode()
    return entries

def build(destination):
    entries = payload()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(entries.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data)
    with zipfile.ZipFile(destination) as archive:
        assert archive.testzip() is None
        assert set(archive.namelist()) == set(entries)
        manifest = json.loads(archive.read('MANIFEST.json'))
        for name, digest in manifest['files'].items():
            assert hashlib.sha256(archive.read(name)).hexdigest() == digest
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    destination.with_suffix('.zip.sha256').write_text(f'{digest}  {destination.name}\n')
    return {'file': str(destination), 'bytes': destination.stat().st_size, 'files': len(entries), 'sha256': digest}

if __name__ == '__main__':
    print(json.dumps(build(ROOT / 'dist/gradescope-study-companion.zip'), indent=2))
