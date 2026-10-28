// Copyright (C) 2026 lucasgogogo — https://github.com/lucasgogogo/rednote-us-stock-sentiment-skill
// SPDX-License-Identifier: AGPL-3.0-only
// Author-attribution notice: see ATTRIBUTION.md (AGPL section 7(b)).
import {installLease} from './lease.mjs';
// Own-session initialization; never exports cookies or attaches a user tab.
import fs from 'node:fs';
import path from 'node:path';
import {BrowserBridge} from './upstream.mjs';
import {arg,write,sleep,read} from './io.mjs';
import {validateConfig} from './config.mjs';
installLease();
const root=path.resolve(arg('--run',true));
const initialized=fs.existsSync(path.join(root,'run-config.json'));
if(initialized&&fs.existsSync(path.join(root,'session.json')))throw new Error('Run already initialized; resume its existing collector');
if(initialized&&['raw-freeze.json','selected-posts.json','posts.jsonl'].some(n=>fs.existsSync(path.join(root,n))))throw new Error('Missing session for a started run; do not reinitialize collected evidence');
const number=(key,fallback,max)=>{const n=Number(arg(key)??fallback);if(!Number.isInteger(n)||n<1||n>max)throw new Error('Invalid '+key);return n;};
const cfg=initialized?read(path.join(root,'run-config.json')):{created_at:new Date().toISOString(),session:'rn-stock-'+Date.now(),context_id:arg('--context-id')||undefined,host:'www.rednote.com',keyword:arg('--keyword')||'美股',max_posts:number('--max-posts',100,100),max_comments:number('--max-comments',50,50),minimum_gap_ms:3500,timezone:arg('--timezone')||'America/Winnipeg'};
validateConfig(cfg);
new Intl.DateTimeFormat('en',{timeZone:cfg.timezone});
if(!initialized)write(path.join(root,'run-config.json'),cfg);
const bridge=new BrowserBridge();
try{
 const page=await bridge.connect({session:cfg.session,contextId:cfg.context_id,windowMode:'foreground',surface:'browser'});
 await page.goto(`https://${cfg.host}/search_result?keyword=${encodeURIComponent(cfg.keyword)}&source=web_search_result_notes`);await sleep(1800);
 write(path.join(root,'session.json'),{page:page.getActivePage(),session:cfg.session,context_id:cfg.context_id});
 console.log(JSON.stringify({initialized:true,run:root,next:'collect.mjs open-filter --run <run>'}));
}finally{await bridge.close();}
