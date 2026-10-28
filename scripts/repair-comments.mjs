// Copyright (C) 2026 lucasgogogo — https://github.com/lucasgogogo/rednote-us-stock-sentiment-skill
// SPDX-License-Identifier: AGPL-3.0-only
// Author-attribution notice: see ATTRIBUTION.md (AGPL section 7(b)).
import {validateConfig} from './config.mjs';
import {installLease} from './lease.mjs';
// Portable adaptation of our 2026-10-28 collector; upstream imports unchanged.
import path from 'node:path';
import fs from 'node:fs';
import {BrowserBridge} from './upstream.mjs';
import {collectPublicComments} from './public-comments.mjs';
import {PAGE_GUARD_JS} from './data-utils.mjs';
installLease();
const i=process.argv.indexOf('--run');if(i<0||!process.argv[i+1])throw new Error('Missing --run');const root=path.resolve(process.argv[i+1]).replaceAll(path.sep,'/');
const cfg=JSON.parse(fs.readFileSync(`${root}/run-config.json`,'utf8'));validateConfig(cfg);const session=JSON.parse(fs.readFileSync(`${root}/session.json`,'utf8'));
const progress=JSON.parse(fs.readFileSync(`${root}/progress.json`,'utf8'));
if(progress.state!=='pass_finished')throw new Error('Finish main collector before serial comment repair');
const rows=fs.readFileSync(`${root}/posts.jsonl`,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const updatePath=`${root}/comment-updates.jsonl`;
const updates=fs.existsSync(updatePath)?fs.readFileSync(updatePath,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const done=new Set(updates.filter(x=>(x.comments?.length>=cfg.max_comments||x.comments_stop_reason==='end_of_primary_comments')).map(x=>x.note_id));
const targets=rows.filter(r=>r.within_24h===true&&r.comments.length<cfg.max_comments&&(!r.comments_success||(r.comment_total_display??0)>r.comments.length||r.comments_has_more===true));
const b=new BrowserBridge();const p=await b.connect({session:cfg.session,contextId:cfg.context_id,windowMode:'foreground',surface:'browser'});p.setActivePage(session.page);
let state='pass_finished';
try {
 for(const row of targets){
  if(done.has(row.note_id))continue;
  let result=null;
  const existingDir=`${root}/raw/comments-structured/${row.note_id}`;
  if(fs.existsSync(existingDir)){
   const finals=fs.readdirSync(existingDir).map(n=>`${existingDir}/${n}/final.json`).filter(f=>fs.existsSync(f)).map(f=>({file:f,data:JSON.parse(fs.readFileSync(f,'utf8'))}));
   const usable=finals.filter(x=>(x.data.results.length>=cfg.max_comments||x.data.stop_reason==='end_of_primary_comments')).sort((a,b)=>b.data.results.length-a.data.results.length);
   if(usable.length)result=usable[0].data;
  }
  if(!result){
   await new Promise(r=>setTimeout(r,3500));await p.goto(row.url);await new Promise(r=>setTimeout(r,1800));
   const g=await p.evaluate(PAGE_GUARD_JS);if(g.auth||g.security)throw new Error(g.security?'STOP_SECURITY':'STOP_AUTH');
   result=await collectPublicComments(p,row.note_id,root,cfg.max_comments);
  }
  const update={note_id:row.note_id,updated_at:new Date().toISOString(),comments:result.results,comments_success:true,
    raw_primary_count:result.raw_primary_observed,raw_nested_count:result.raw_nested_count,
    comments_has_more:result.hasMore,comments_stop_reason:result.stop_reason,comments_raw_steps_dir:result.raw_steps_dir,
    original_primary_count:row.comments.length};
  fs.appendFileSync(updatePath,JSON.stringify(update)+'\n');updates.push(update);done.add(row.note_id);
  fs.writeFileSync(`${root}/comment-repair-progress.json`,JSON.stringify({state:'repairing',targets:targets.length,done:done.size},null,2)+'\n');
  console.log(JSON.stringify({event:'comments_repaired',note_id:row.note_id,before:row.comments.length,after:result.results.length,stop:result.stop_reason}));
 }
}catch(e){state=e.message;console.log(JSON.stringify({event:'repair_stopped',error:e.message}));process.exitCode=1;}
finally{fs.writeFileSync(`${root}/comment-repair-progress.json`,JSON.stringify({state,targets:targets.length,done:done.size,finished_at:new Date().toISOString()},null,2)+'\n');await b.close();}
