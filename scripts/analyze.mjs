// Copyright (C) 2026 lucasgogogo — https://github.com/lucasgogogo/rednote-us-stock-sentiment-skill
// SPDX-License-Identifier: AGPL-3.0-only
// Author-attribution notice: see ATTRIBUTION.md (AGPL section 7(b)).
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {read,write,rows,arg} from './io.mjs';
import {verifyFreeze} from './freeze.mjs';
export const categories=['看多','看空','中性','多空混合','无法判断'];
const blank=()=>Object.fromEntries(categories.map(c=>[c,0]));
const hasQuote=(text,quote)=>typeof quote==='string'&&quote.trim()&&text.replace(/\s/g,'').includes(quote.replace(/\s/g,''));
export function conclusion(counts){
 const known=Object.values(counts).reduce((a,b)=>a+b,0)-counts['无法判断'];
 if(!known||counts['无法判断']>=Object.values(counts).reduce((a,b)=>a+b,0)/2)return ['信息不足','方向待判'];
 const directional=counts['看多']+counts['看空'];
 const first=counts['中性']>=Math.max(counts['看多'],counts['看空'],counts['多空混合'])?'中性为主':counts['多空混合']>Math.max(counts['看多'],counts['看空'])?'多空分歧':counts['看多']>counts['看空']?'看多较多':counts['看空']>counts['看多']?'看空较多':'多空相近';
 return [first,!directional?'暂无单向表达':counts['看多']>counts['看空']?'方向偏多':counts['看空']>counts['看多']?'方向偏空':'方向均衡'];
}
export function analyzeRun(root){
 verifyFreeze(root);const cfg=read(path.join(root,'run-config.json'));const posts=rows(path.join(root,'posts-final.jsonl')).filter(x=>x.detail_success&&x.within_24h===true);
 const annotationFile=path.join(root,'analysis/annotations.json');
 if(!fs.existsSync(annotationFile)){
  write(annotationFile,posts.map(x=>({note_id:x.note_id,reviewed:false,stance:'无法判断',evidence:'',reason:'',stocks:[]})));
  throw new Error('Created annotation scaffold. Review title/body evidence, set reviewed:true, then rerun.');
 }
 const annotations=read(annotationFile);const map=new Map(annotations.map(x=>[x.note_id,x]));
 if(map.size!==posts.length||map.size!==annotations.length||posts.some(p=>!map.has(p.note_id)))throw new Error('Annotations must match all accepted posts exactly once');
 const counts=blank(),stockMap=new Map(),bins=Array(12).fill(0);let comments=0;
 for(const p of posts){
  const a=map.get(p.note_id),text=(p.title||'')+'\n'+(p.body||'');
  if(a.reviewed!==true||!categories.includes(a.stance))throw new Error('Unreviewed or invalid stance: '+p.note_id);
  if(a.stance!=='无法判断'&&!hasQuote(text,a.evidence))throw new Error('Missing verbatim stance evidence: '+p.note_id);
  if(a.stance==='无法判断'&&!a.reason)throw new Error('Unknown requires a reason');
  counts[a.stance]++;comments+=p.comments.length;
  const index=Math.min(11,Math.floor((Date.parse(p.published_at)-Date.parse(cfg.window_start_utc))/7200000));if(index<0||index>11)throw new Error('Outside fixed window');bins[index]++;
  const seen=new Set();
  for(const s of a.stocks||[]){
   const ticker=s.ticker==='GOOG'?'GOOGL':s.ticker;
   if(!ticker||!s.name||!categories.includes(s.stance)||!hasQuote(text,s.evidence))throw new Error('Stock entry needs identity, stance, and verbatim evidence');
   if(s.asset_type!=='stock')throw new Error('Only verified individual stocks may enter ranking');
   if(seen.has(ticker))throw new Error('Duplicate stock in a post');seen.add(ticker);
   if(!stockMap.has(ticker))stockMap.set(ticker,{ticker,name:s.name,posts:0,post_stance_counts:blank()});
   const entry=stockMap.get(ticker);entry.posts++;entry.post_stance_counts[s.stance]++;
  }
 }
 const metricsPath=path.join(root,'metrics.json');const metrics=fs.existsSync(metricsPath)?read(metricsPath):null;
 const result={schema_version:'1.0',demo:false,keyword:cfg.keyword,source:'rednote.com',window_start_utc:cfg.window_start_utc,window_end_utc:cfg.window_end_utc,timezone:cfg.timezone||'America/Winnipeg',posts_in_window:posts.length,primary_comments_exported:comments,max_comments_per_post:cfg.max_comments,stance_counts:counts,timeline:bins,stock_ranking:[...stockMap.values()].sort((a,b)=>b.posts-a.posts||a.ticker.localeCompare(b.ticker)),metrics};
 write(path.join(root,'analysis/report.json'),result,false);return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(analyzeRun(path.resolve(arg('--run',true)))));
