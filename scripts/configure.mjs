import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
if(process.platform!=='darwin')throw Error('This release requires macOS Keychain. See ROADMAP.md.');
const config={mcpServers:{gradescope:{command:process.execPath,args:[path.join(root,'src/server.mjs')],env:{NODE_NO_WARNINGS:'1',PATH:process.env.PATH||'/usr/bin:/bin'}}}};
fs.writeFileSync(path.join(root,'.mcp.json'),JSON.stringify(config,null,2)+'\n',{mode:0o600});
console.log('Generated local .mcp.json. It contains machine paths and is ignored by Git.');
