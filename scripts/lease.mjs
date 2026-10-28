// Copyright (C) 2026 lucasgogogo — https://github.com/lucasgogogo/rednote-us-stock-sentiment-skill
// SPDX-License-Identifier: AGPL-3.0-only
// Author-attribution notice: see ATTRIBUTION.md (AGPL section 7(b)).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
export function acquireLease(file=path.join(os.tmpdir(),'rednote-us-stock-sentiment.lock')){
 const owner=crypto.randomUUID();
 try{fs.writeFileSync(file,JSON.stringify({pid:process.pid,owner,started_at:new Date().toISOString()}),{flag:'wx'});}catch(e){if(e.code==='EEXIST')throw new Error('Another collector or unresolved previous lease exists: '+file);throw e;}
 return ()=>{if(fs.existsSync(file)&&JSON.parse(fs.readFileSync(file,'utf8')).owner===owner)fs.unlinkSync(file);};
}
export function installLease(){const release=acquireLease();process.once('exit',release);return release;}
