import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

process.umask(0o077);
export const ROOT = process.env.GRADESCOPE_DATA_DIR || path.join(os.homedir(), 'Library/Application Support/GradescopePersonal');
export const now = () => new Date().toISOString();
export const hash = value => crypto.createHash('sha256').update(value).digest('hex');
for (const dir of ['', 'files', 'pages', 'jobs']) fs.mkdirSync(path.join(ROOT, dir), { recursive: true, mode: 0o700 });
export function atomic(file, value) {
  const tmp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value), { mode: 0o600 });
  fs.renameSync(tmp, file);
}
export const db = new DatabaseSync(path.join(ROOT, 'archive.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,course_id TEXT,data TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(kind,id));
CREATE TABLE IF NOT EXISTS changes(seq INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT,id TEXT,at TEXT,summary TEXT);
CREATE TABLE IF NOT EXISTS search(kind TEXT,id TEXT,text TEXT,PRIMARY KEY(kind,id));
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);`);
export function get(kind, id) {
  const r = db.prepare('SELECT data FROM records WHERE kind=? AND id=?').get(kind, String(id));
  return r ? JSON.parse(r.data) : null;
}
export function put(kind, id, data, text='') {
  id = String(id);
  const previous = get(kind, id);
  const canonical = x => JSON.stringify(x, (k,v) => ['fetched_at','last_seen_at','time_left_seconds'].includes(k) ? undefined : v);
  const changed = !previous || canonical(previous) !== canonical(data);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO records VALUES(?,?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET course_id=excluded.course_id,data=excluded.data,updated_at=excluded.updated_at').run(kind,id,data.course_id || null,JSON.stringify(data),now());
    db.prepare('DELETE FROM search WHERE kind=? AND id=?').run(kind,id);
    db.prepare('INSERT INTO search(kind,id,text) VALUES(?,?,?)').run(kind,id,text || data.title || data.name || '');
    if(changed) db.prepare('INSERT INTO changes(kind,id,at,summary) VALUES(?,?,?,?)').run(kind,id,now(),`${previous ? 'Updated' : 'Added'} ${data.title || data.name || kind}`);
    db.exec('COMMIT');
  } catch(e) { db.exec('ROLLBACK'); throw e; }
  return changed;
}
export function all(kind, courseId) {
  const rows = courseId ? db.prepare('SELECT data FROM records WHERE kind=? AND course_id=? ORDER BY id').all(kind,String(courseId)) : db.prepare('SELECT data FROM records WHERE kind=? ORDER BY id').all(kind);
  return rows.map(r=>JSON.parse(r.data));
}
export function setting(key, value) {
  if(value !== undefined) db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(value));
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return row ? JSON.parse(row.value) : null;
}
export function acquireLock() {
  const file = path.join(ROOT,'browser.lock');
  for(let i=0;i<2;i++) {
    try {
      const fd=fs.openSync(file,'wx',0o600); fs.writeFileSync(fd,String(process.pid)); fs.closeSync(fd);
      return () => { try { if(fs.readFileSync(file,'utf8')===String(process.pid)) fs.unlinkSync(file); } catch {} };
    } catch(e) {
      if(e.code!=='EEXIST') throw e;
      let alive=true;
      try { const pid=Number(fs.readFileSync(file,'utf8')); if(!Number.isSafeInteger(pid)||pid<=0) throw Error(); process.kill(pid,0); } catch { alive=false; }
      if(alive) throw new Error('BROWSER_BUSY');
      fs.rmSync(file,{force:true});
    }
  }
  throw new Error('BROWSER_BUSY');
}
