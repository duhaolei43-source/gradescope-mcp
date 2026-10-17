import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import zipfile
spec = importlib.util.spec_from_file_location('package_skill', Path(__file__).with_name('package_skill.py'))
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)

class PackageTests(unittest.TestCase):
    def test_deterministic_and_root_entry(self):
        with tempfile.TemporaryDirectory() as d:
            a, b = Path(d)/'a.zip', Path(d)/'b.zip'
            p.build(a); p.build(b)
            self.assertEqual(a.read_bytes(), b.read_bytes())
            with zipfile.ZipFile(a) as z:
                self.assertIn('SKILL.md', z.namelist())
                self.assertNotIn('runtime/.mcp.json', z.namelist())
                self.assertFalse(any('node_modules/' in n or '..' in Path(n).parts for n in z.namelist()))
    def test_rejects_malformed_frontmatter(self):
        for value in ['# no metadata', '---\nname: Wrong Name\ndescription: hi\n---\n']:
            with self.assertRaises(ValueError): p.validate_frontmatter(value)
    def test_rejects_private_source_path_and_symlink(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root/'bad').write_text('/Users/synthetic/private')
            with patch.object(p, 'SKILL', root), patch.object(p, 'SKILL_FILES', ['bad']):
                with self.assertRaises(ValueError): p.payload()
            (root/'link').symlink_to(root/'bad')
            with patch.object(p, 'SKILL', root), patch.object(p, 'SKILL_FILES', ['link']):
                with self.assertRaises(ValueError): p.payload()
if __name__ == '__main__': unittest.main()
