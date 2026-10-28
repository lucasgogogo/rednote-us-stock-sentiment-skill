// Copyright (C) 2026 lucasgogogo — https://github.com/lucasgogogo/rednote-us-stock-sentiment-skill
// SPDX-License-Identifier: AGPL-3.0-only
// Author-attribution notice: see ATTRIBUTION.md (AGPL section 7(b)).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {read,write,rows,arg} from './io.mjs';
import {realTimestamp} from './data-utils.mjs';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function walk(root,dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.join(dir,e.name);if(e.isSymbolicLink())throw new Error('Symlink not allowed in raw');return e.isDirectory()?walk(root,p):[path.relative(root,p).replaceAll('\\','/')];});}
export function verifyFreeze(root){
 const freeze=read(path.join(root,'raw-freeze.json'));
 for(const f of freeze.files){const p=path.resolve(root,f.path);if(!p.startsWith(path.resolve(root)+path.sep))throw new Error('Invalid manifest path');if(hash(p)!==f.sha256)throw new Error('Raw changed: '+f.path);}
 return freeze;
}
export function freezeRun(root){
 if(fs.existsSync(path.join(root,'raw-freeze.json')))return verifyFreeze(root);
 const cfg=read(path.join(root,'run-config.json'));const progress=read(path.join(root,'progress.json'));
 if(!['pass_finished','STOP_AUTH','STOP_SECURITY','stopped_after_three_failures'].includes(progress.state))throw new Error('Finish or explicitly stop collection before freezing');
 if(!cfg.window_start_utc||!cfg.window_end_utc)throw new Error('Window was not frozen');
 const originals=rows(path.join(root,'posts.jsonl'));const updates=new Map(rows(path.join(root,'comment-updates.jsonl')).map(x=>[x.note_id,x]));
 const final=originals.map(x=>({...x,...updates.get(x.note_id)}));
 if(new Set(final.map(x=>x.note_id)).size!==final.length||final.length>cfg.max_posts)throw new Error('Duplicate or excessive posts');
 for(const p of final){
  if(!Array.isArray(p.comments)||p.comments.length>cfg.max_comments)throw new Error('Comment cap exceeded');
  const ids=p.comments.filter(c=>c.id).map(c=>c.id);if(new Set(ids).size!==ids.length)throw new Error('Duplicate comment ID');
  if(p.within_24h===true){
   const raw=read(path.join(root,'raw/details',p.note_id+'.json'));
   const stamp=raw.note_metadata?.note?.time;
   let actual=realTimestamp(stamp);
   if(!actual&&p.published_time_source==='target_note_time_element.datetime')actual=(raw.note_metadata.dom_dates||[]).map(x=>realTimestamp(x.datetime)).find(x=>x===p.published_at)||null;
   if(!p.published_time_source||!actual||p.published_at!==actual||actual<cfg.window_start_utc||actual>cfg.window_end_utc)throw new Error('Real publication time mismatch');
  }
 }
 const finalPath=path.join(root,'posts-final.jsonl');fs.writeFileSync(finalPath,final.map(x=>JSON.stringify(x)).join('\n')+'\n',{flag:'wx'});
 const names=[...walk(root,path.join(root,'raw')),'run-config.json','progress.json','posts.jsonl','posts-final.jsonl'];
 if(fs.existsSync(path.join(root,'comment-updates.jsonl')))names.push('comment-updates.jsonl');
 const result={frozen_at:new Date().toISOString(),files:names.sort().map(p=>({path:p,sha256:hash(path.join(root,p))}))};
 write(path.join(root,'raw-freeze.json'),result);return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(freezeRun(path.resolve(arg('--run',true)))));
