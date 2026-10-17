#!/usr/bin/env python3
"""Verify the actual ZIP in a fresh directory; npm installation uses the network."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import zipfile

root = Path(__file__).resolve().parents[1]
archive = root / 'dist/gradescope-study-companion.zip'
with tempfile.TemporaryDirectory(prefix='gradescop-package-proof-') as tmp:
    target = Path(tmp) / 'gradescope-study-companion'
    target.mkdir()
    with zipfile.ZipFile(archive) as z:
        for name in z.namelist():
            if Path(name).is_absolute() or '..' in Path(name).parts:
                raise ValueError('Unsafe archive member')
        z.extractall(target)
    manifest = json.loads((target/'MANIFEST.json').read_text())
    for name, digest in manifest['files'].items():
        assert hashlib.sha256((target/name).read_bytes()).hexdigest() == digest
    for doc in target.rglob('*.md'):
        for link in re.findall(r'\]\(([^)]+)\)',doc.read_text()):
            if '://' not in link and not link.startswith('#'):
                assert (doc.parent/link.split('#')[0]).exists(), f'Broken link in {doc.relative_to(target)}: {link}'
    runtime = target/'runtime'
    for args in [['npm','ci'],['node','scripts/doctor.mjs'],['npm','test'],['node','scripts/configure.mjs']]:
        subprocess.run(args,cwd=runtime,check=True)
    config = json.loads((runtime/'.mcp.json').read_text())['mcpServers']['gradescope']
    assert Path(config['args'][0]).resolve() == (runtime/'src/server.mjs').resolve()
    assert Path(config['command']).is_absolute()
    print('PASS: extracted ZIP hashes, relative links, clean install, doctor, runtime tests and relocated configuration')
