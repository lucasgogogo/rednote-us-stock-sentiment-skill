// Copyright (C) 2026 lucasgogogo — https://github.com/lucasgogogo/rednote-us-stock-sentiment-skill
// SPDX-License-Identifier: AGPL-3.0-only
// Author-attribution notice: see ATTRIBUTION.md (AGPL section 7(b)).
import {validateConfig} from './config.mjs';
import {installLease} from './lease.mjs';
// Portable adaptation of our 2026-10-28 collector; upstream imports unchanged.
import path from 'node:path';
import fs from 'node:fs';
import { BrowserBridge } from './upstream.mjs';
import { buildScrollHarvestJs } from './upstream.mjs';
import { NOTE_EXTRACT_JS } from './upstream.mjs';
import { buildCommentsExtractJs, normalizeCommentRows, assertCommentsLoaded } from './upstream.mjs';
import { realTimestamp, inWindow, mergeSearchRows, extractPublicNote, PAGE_GUARD_JS, addCommentEndGuard } from './data-utils.mjs';
import { collectPublicComments } from './public-comments.mjs';


installLease();
const i=process.argv.indexOf('--run');if(i<0||!process.argv[i+1])throw new Error('Missing --run');const root=path.resolve(process.argv[i+1]).replaceAll(path.sep,'/');
const cfg=JSON.parse(fs.readFileSync(`${root}/run-config.json`,'utf8'));validateConfig(cfg);
const mode=process.argv[2];if(!['replace-collapsed','observe','reload','open-filter','filters','search','search-continue','first','collect','close'].includes(mode))throw new Error('Invalid collection mode');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const save=(p,obj,exclusive=true)=>{fs.mkdirSync(p.slice(0,p.lastIndexOf('/')),{recursive:true});fs.writeFileSync(p,JSON.stringify(obj,null,2)+'\n',{flag:exclusive?'wx':'w'});};
const event=(kind,more={})=>{const obj={at:new Date().toISOString(),event:kind,...more};fs.appendFileSync(`${root}/events.jsonl`,JSON.stringify(obj)+'\n');console.log(JSON.stringify(obj));};
const bridge=new BrowserBridge();
const page=await bridge.connect({session:cfg.session,contextId:cfg.context_id,windowMode:'foreground',surface:'browser'});
const session=read(`${root}/session.json`); if(session.page) page.setActivePage(session.page);
async function guard() {
  const g=await page.evaluate(PAGE_GUARD_JS);
  if(g.auth || g.security) {save(`${root}/raw/blocked-${Date.now()}.json`,g);throw new Error(g.security?'STOP_SECURITY':'STOP_AUTH');}
}

try {
  if(mode==='replace-collapsed') {
    // Same owned-tab recovery as the upstream Xiaohongshu adapter; no user tabs.
    const previous=page.getActivePage();
    const fresh=await page.newTab(`https://${cfg.host}/search_result?keyword=${encodeURIComponent(cfg.keyword)}&source=web_search_result_notes`);
    if(!fresh)throw new Error('Owned replacement tab missing identity');
    page.setActivePage(fresh);await page.closeTab(previous);
    save(`${root}/session.json`,{page:fresh,session:cfg.session,context_id:cfg.context_id},false);
    await sleep(1800);await guard();
    const diag=await page.evaluate(`(() => ({count:document.querySelectorAll('section.note-item').length,feedHeight:document.querySelector('.feeds-container')?.clientHeight,innerHeight,rootHeight:document.scrollingElement?.scrollHeight,body:document.body.innerText.slice(0,400)}))()`);
    save(`${root}/raw/search/replaced-owned-tab-${Date.now()}.json`,diag);console.log(JSON.stringify({owned_tab_replaced:true,diag}));
  } else if(mode==='observe' || mode==='reload') {
    if(mode==='reload')await page.goto(`https://${cfg.host}/search_result?keyword=${encodeURIComponent(cfg.keyword)}&source=web_search_result_notes`);
    await guard();
    const result=await page.evaluate(`(() => ({url:location.href,text:document.body.innerText.slice(0,1800),filters:[...document.querySelectorAll('.filter, .filter-panel, .filters')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({cls:e.className,text:e.innerText,html:e.outerHTML.slice(0,2000)})),count:document.querySelectorAll('section.note-item').length}))()`);
    save(`${root}/raw/search/observe-${Date.now()}.json`,result); console.log(JSON.stringify(result));
  } else if(mode==='open-filter') {
    await guard();
    const click=await page.evaluate(`(() => {const es=[...document.querySelectorAll('div.filter')].filter(e=>e.getBoundingClientRect().width>0);if(es.length!==1)return {ok:false,count:es.length};es[0].click();return {ok:true};})()`);
    if(!click.ok) throw new Error('Ambiguous filter trigger');
    await sleep(400);
    const panel=await page.evaluate(`(() => ({panels:[...document.querySelectorAll('.filter-panel')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({text:e.innerText,html:e.outerHTML.slice(0,16000)}))}))()`);
    save(`${root}/raw/search/filter-panel-${Date.now()}.json`,panel);console.log(JSON.stringify(panel));
  } else if(mode==='filters') {
    await guard();
    const applied=[];
    for(const [group,option] of [['排序依据','最新'],['发布时间','一天内']]) {
      const result=await page.evaluateOnce(`(() => {
        const visible=e=>{if(!e||e.closest('[aria-hidden="true"],[hidden],[inert]'))return false;const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)return false;for(let p=e;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<.01)return false;}return true;};
        const groups=[...document.querySelectorAll('.filter-panel .filters')].filter(visible).filter(e=>[...e.children].some(c=>c.tagName==='SPAN'&&c.textContent.trim()===${JSON.stringify(group)}));
        if(groups.length!==1)return {ok:false,reason:'group_count',count:groups.length};
        const choices=[...groups[0].querySelectorAll('.tag-container > .tags')].filter(visible).filter(e=>e.textContent.trim()===${JSON.stringify(option)});
        if(choices.length!==1)return {ok:false,reason:'option_count',count:choices.length};
        const active=choices[0].classList.contains('active');if(!active)choices[0].click();return {ok:true,already_active:active};
      })()`);
      save(`${root}/raw/search/filter-${Date.now()}-${option}.json`,result);
      if(!result.ok)throw new Error('FILTER_NOT_APPLIED_'+group);
      await sleep(cfg.minimum_gap_ms);await guard();applied.push({group,option,...result});
    }
    const active=await page.evaluate(`(() => {
      const visible=e=>{if(e.closest('[aria-hidden="true"],[hidden],[inert]'))return false;const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)return false;for(let p=e;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<.01)return false;}return true;};
      return [...document.querySelectorAll('.filter-panel .filters')].filter(visible).map(g=>({group:[...g.children].find(e=>e.tagName==='SPAN')?.textContent.trim(),active:[...g.querySelectorAll('.tags.active')].filter(visible).map(e=>e.textContent.trim())}));
    })()`);
    for(const expected of applied){if(!active.some(g=>g.group===expected.group&&g.active.includes(expected.option)))throw new Error('FILTER_ACTIVE_STATE_MISSING');}
    const verified={verified_at:new Date().toISOString(),applied,active};
    save(`${root}/raw/search/filters-verified-${Date.now()}.json`,verified);
    save(`${root}/filters-verified.json`,verified,false);
    await page.evaluateOnce(`(() => {const es=[...document.querySelectorAll('.filter-panel .operation')].filter(e=>!e.closest('[aria-hidden="true"]')&&getComputedStyle(e).opacity>.01&&e.textContent.trim()==='收起');if(es.length===1)es[0].click();return {closed:es.length===1};})()`);
    console.log(JSON.stringify({filters_verified:true,active}));
  } else if(mode==='search' || mode==='search-continue') {
    await guard();
    if(mode==='search'&&fs.existsSync(`${root}/selected-posts.json`)) throw new Error('Search already saved; refusing repeated search');
    // Capture the new actual collection window once login and filtering are ready.
    if(mode==='search') {
      save(`${root}/raw/search/preflight-config.json`,cfg);
      const end=new Date();cfg.window_end_utc=end.toISOString();cfg.window_start_utc=new Date(end.getTime()-86400000).toISOString();cfg.window_frozen_at=end.toISOString();
    }
    cfg.filters_verified=read(`${root}/filters-verified.json`);
    save(`${root}/run-config.json`,cfg,false);
    const acc=new Map(); let stop='chunk-cap';
    if(mode==='search-continue')mergeSearchRows(acc,read(`${root}/selected-posts.json`).filter(r=>r.title),cfg.max_posts);
    const roundStamp=Date.now();
    for(let chunk=1;chunk<=10;chunk++) {
      await guard();
      let code=buildScrollHarvestJs(cfg.host,cfg.max_posts,{maxRounds:10,budgetMs:33000,step:900});
      const marker='await wait(atBottom ? 1000 : 500);';
      if(!code.includes(marker)) throw new Error('Upstream harvest timing changed');
      code=code.replace(marker,'await wait(3500);');
      const result=await page.evaluate(code);
      save(`${root}/raw/search/harvest-${roundStamp}-${String(chunk).padStart(2,'0')}.json`,{collected_at:new Date().toISOString(),...result});
      if(result.diag?.securityBlock) throw new Error('STOP_SECURITY');
      if(result.diag?.cardCount>1 && result.diag?.feedClientHeight===0 && result.diag?.distinctCardTops===1)throw new Error('COLLAPSED_SEARCH_LAYOUT_NOT_EXHAUSTED');
      const before=acc.size;mergeSearchRows(acc,(result.rows||[]).filter(r=>r.title),cfg.max_posts);
      save(`${root}/search-progress.json`,{chunks:chunk,candidates:acc.size,diag:result.diag},false);
      event('search_chunk',{chunk,candidates:acc.size,added:acc.size-before,reason:result.diag?.stopReason});
      if(acc.size>=cfg.max_posts){stop='target_100';break;}
      if(['exhausted','wedged'].includes(result.diag?.stopReason) && acc.size===before){stop=result.diag.stopReason;break;}
      await sleep(cfg.minimum_gap_ms);
    }
    const selectionFile=mode==='search-continue'?'selected-posts-expanded.json':'selected-posts.json';
    save(`${root}/${selectionFile}`,[...acc.values()]);
    if(mode==='search-continue'){cfg.selected_posts_file=selectionFile;save(`${root}/run-config.json`,cfg,false);}
    save(`${root}/search-result-${roundStamp}.json`,{candidates:acc.size,stop_reason:stop});
    event('search_finished',{candidates:acc.size,stop_reason:stop});
  } else if(mode==='first' || mode==='collect') {
    const selected=read(`${root}/${cfg.selected_posts_file||'selected-posts.json'}`).slice(0,cfg.max_posts);
    const ledger=`${root}/posts.jsonl`;
    if(!fs.existsSync(ledger))fs.writeFileSync(ledger,'',{flag:'wx'});
    const prior=fs.existsSync(ledger)?fs.readFileSync(ledger,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
    const processed=new Set(prior.map(r=>r.note_id));
    let accepted=prior.filter(r=>r.within_24h===true && r.detail_success).length;
    let failures=0,attempted=0,state='pass_finished';
    for(const entry of selected) {
      const nid=entry.note_id;if(processed.has(nid))continue;
      if(accepted>=cfg.max_posts)break;
      const record={note_id:nid,url:entry.url,search:entry,collected_at:new Date().toISOString(),detail_success:false,comments_success:false,comments:[],within_24h:null};
      try {
        const detailFile=`${root}/raw/details/${nid}.json`;
        let visible,meta;
        if(fs.existsSync(detailFile)) {
          const previous=read(detailFile);visible=previous.visible;meta=previous.note_metadata;
        } else {
          await sleep(cfg.minimum_gap_ms); await page.goto(entry.url);await sleep(1800);await guard();
          visible=await page.evaluate(NOTE_EXTRACT_JS);
          meta=await page.evaluate(`(${extractPublicNote.toString()})(${JSON.stringify(nid)})`);
          save(detailFile,{collected_at:new Date().toISOString(),visible,note_metadata:meta});
        }
        if(visible.securityBlock)throw new Error('STOP_SECURITY');if(visible.loginWall)throw new Error('STOP_AUTH');
        if(visible.notFound || (!visible.title&&!visible.author))throw new Error('DETAIL_UNAVAILABLE');
        const n=meta.note||{};
        let iso=realTimestamp(n.time),timeRaw=n.time??null,timeSource=iso?meta.state_source+'.time':null;
        if(!iso){for(const d of meta.dom_dates||[]){const candidate=realTimestamp(d.datetime);if(candidate){iso=candidate;timeRaw=d.datetime;timeSource='target_note_time_element.datetime';break;}}}
        record.detail_success=true;record.title=n.title||visible.title||'';record.body=n.desc||visible.desc||'';
        record.author=n.user||visible.author;record.published_at=iso;record.published_time_raw=timeRaw;record.published_time_source=timeSource;
        record.dom_dates=meta.dom_dates;record.within_24h=inWindow(iso,cfg);
        record.counts=n.interactInfo||{likes_display:visible.likes||null,collects_display:visible.collects||null,comments_display:visible.comments||null};
        record.image_urls=(n.imageList||[]).map(im=>im.urlDefault||im.urlPre||im.url||'').filter(Boolean);
        record.type=n.type||null;record.tags=n.tagList||visible.tags||[];
        if(record.within_24h===true){
          accepted++;
          await sleep(cfg.minimum_gap_ms);
          const commentFile=`${root}/raw/comments/${nid}.json`;
          let commentsRaw;
          if(fs.existsSync(commentFile))commentsRaw=read(commentFile);
          else {
            const currentPath=await page.evaluate('location.pathname');
            if(!String(currentPath).includes(nid)){await page.goto(entry.url);await sleep(1800);await guard();}
            commentsRaw=await collectPublicComments(page,nid,root,cfg.max_comments);
            save(commentFile,{collected_at:new Date().toISOString(),...commentsRaw});
          }
          if(commentsRaw.securityBlock)throw new Error('STOP_SECURITY');if(commentsRaw.loginWall)throw new Error('STOP_AUTH');
          const comments=commentsRaw.source?commentsRaw.results:normalizeCommentRows(commentsRaw.results,'rednote/comments-24h');
          if(!commentsRaw.source)assertCommentsLoaded(commentsRaw,comments.length,'rednote/comments-24h');
          record.comments=comments.filter(c=>!c.is_reply).slice(0,cfg.max_comments);
          record.comments_success=true;record.raw_primary_count=comments.filter(c=>!c.is_reply).length;
          record.raw_nested_count=commentsRaw.raw_nested_count??comments.filter(c=>c.is_reply).length;record.comment_total_display=commentsRaw.commentTotal??null;
          record.comments_skipped_empty=commentsRaw.skippedEmpty??0;
          record.comments_has_more=commentsRaw.hasMore??null;record.comments_stop_reason=commentsRaw.stop_reason??null;
        } else {record.exclusion_reason=iso?'outside_fixed_24h_window':'missing_real_published_time';}
        failures=0;
      } catch(e) {record.error=e.message==='NEEDS_VISIBLE_PAGE'?'STOP_VISIBILITY':e.message;failures++;}
      fs.appendFileSync(ledger,JSON.stringify(record)+'\n');prior.push(record);processed.add(nid);attempted++;
      const stats={state:'collecting',selected:selected.length,attempted:prior.length,accepted:prior.filter(r=>r.detail_success&&r.within_24h===true).length,
        comments:prior.reduce((s,r)=>s+r.comments.length,0),excluded:prior.filter(r=>r.exclusion_reason).length,failures:prior.filter(r=>r.error).length,updated_at:new Date().toISOString()};
      save(`${root}/progress.json`,stats,false);event('post_finished',{attempted:prior.length,selected:selected.length,note_id:nid,accepted:stats.accepted,comments:record.comments.length,exclusion:record.exclusion_reason||null,error:record.error||null});
      if(/^STOP_/.test(record.error||'')){state=record.error;break;}
      if(failures>=3){state='stopped_after_three_failures';break;}
      if(mode==='first' && attempted>=1){state='first_post_finished';break;}
    }
    const progress={selected:selected.length,attempted:prior.length,accepted:prior.filter(r=>r.detail_success&&r.within_24h===true).length,comments:prior.reduce((s,r)=>s+r.comments.length,0),excluded:prior.filter(r=>r.exclusion_reason).length,failures:prior.filter(r=>r.error).length};
    save(`${root}/progress.json`,{...progress,state,finished_at:new Date().toISOString()},false);
    event('collection_stage_finished',{state});
  } else if(mode==='close') {await page.closeWindow();event('browser_session_released');}
  else {throw new Error('Expected observe, reload, open-filter, filters, search, first, collect, or close');}
} catch(e) {event('stage_error',{mode,error:e.message});process.exitCode=1;}
finally {await bridge.close();}
