import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {read,write} from '../scripts/io.mjs';
import {realTimestamp,inWindow,mergeSearchRows,extractPublicNote,PAGE_GUARD_JS} from '../scripts/data-utils.mjs';
import {collectPublicComments} from '../scripts/public-comments.mjs';
import {estimate} from '../scripts/cost.mjs';
import {renderSvg,renderReport,validateReport} from '../scripts/render.mjs';
import {freezeRun,verifyFreeze} from '../scripts/freeze.mjs';
import {analyzeRun,conclusion} from '../scripts/analyze.mjs';
import {acquireLease} from '../scripts/lease.mjs';
import {validateConfig} from '../scripts/config.mjs';
const base=path.resolve(import.meta.dirname,'..'),fixture=read(path.join(base,'examples/report.json')),pricing=read(path.join(base,'assets/pricing.json'));
test('seconds/milliseconds, fixed-window boundaries, virtual-list dedup',()=>{
 assert.equal(realTimestamp(1793208906),realTimestamp(1793208906000));assert.equal(realTimestamp('yesterday'),null);
 const cfg={window_start_utc:fixture.window_start_utc,window_end_utc:fixture.window_end_utc};
 assert.equal(inWindow(cfg.window_start_utc,cfg),true);assert.equal(inWindow(cfg.window_end_utc,cfg),true);assert.equal(inWindow('2026-10-29T00:00:00Z',cfg),false);
 const a='000000000000000000000001',b='000000000000000000000002',acc=new Map();
 mergeSearchRows(acc,[{url:`https://www.rednote.com/explore/${a}`,title:'a'}],1);mergeSearchRows(acc,[{url:`https://www.rednote.com/explore/${a}`,title:'updated'},{url:`https://www.rednote.com/explore/${b}`}],1);
 assert.equal(acc.size,1);assert.equal(acc.get(a).title,'updated');
});
test('public note projection omits unrelated account state',()=>{
 globalThis.document={querySelector:()=>null};globalThis.window={__INITIAL_STATE__:{note:{noteDetailMap:{fixture:{note:{noteId:'fixture',time:1,title:'title',private_field:'omit'}}}},user:{credential:'do not export'}}};
 const got=extractPublicNote('fixture');assert.equal(got.note.title,'title');assert.equal(got.note.private_field,undefined);assert.equal(got.user,undefined);delete globalThis.window;delete globalThis.document;
});
test('serial native comment paging, dedup, cap and no child expansion',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rn-comments-'));let phase=0,wheels=0;
 const list=n=>Array.from({length:n},(_,i)=>({id:'demo-'+i,content:'synthetic',createTime:1793208906000,userInfo:{},subComments:[{}]}));
 const fake={evaluate:async code=>code===PAGE_GUARD_JS?{auth:false,security:false}:{note_id:'fixture',visibility:'visible',comments:{list:list([10,20,55][phase]),hasMore:true,loading:false,firstRequestFinish:true},geometry:{top:phase*1000,height:500,scroll_height:3000,x:200,y:400}},cdp:async(method,args)=>{assert.equal(method,'Input.dispatchMouseEvent');assert.equal(args.type,'mouseWheel');wheels++;phase++;}};
 const got=await collectPublicComments(fake,'fixture',dir,50,{sleep:async()=>{}});assert.equal(got.results.length,50);assert.equal(new Set(got.results.map(x=>x.id)).size,50);assert.equal(wheels,2);assert(got.results.every(x=>x.is_reply===false));
 const eof={evaluate:async code=>code===PAGE_GUARD_JS?{auth:false,security:false}:{comments:{list:list(2),hasMore:false,loading:false,firstRequestFinish:true}},cdp:async()=>assert.fail('EOF must not scroll')};
 assert.equal((await collectPublicComments(eof,'eof',dir,50,{sleep:async()=>{}})).results.length,2);
 const hidden={evaluate:async code=>code===PAGE_GUARD_JS?{auth:false,security:false}:{visibility:'hidden',comments:{list:[],hasMore:true,firstRequestFinish:true}},cdp:async()=>assert.fail('Hidden must not scroll')};
 await assert.rejects(collectPublicComments(hidden,'hidden',dir,50,{sleep:async()=>{}}),/NEEDS_VISIBLE_PAGE/);
});
test('usage charges cached input once; missing stays unknown',()=>{
 assert.equal(estimate(null,pricing),null);assert.equal(estimate(fixture.metrics.usage,pricing).usd,1.75);
 assert.throws(()=>estimate({...fixture.metrics.usage,cached_input_tokens:2000000},pricing));
 assert.equal(estimate({input_tokens:28672973,cached_input_tokens:27748480,cache_write_input_tokens:0,output_tokens:147320},pricing).usd,23.54805);
});
test('conclusion is data driven; unknown never becomes bullish',()=>{
 assert.deepEqual(conclusion(fixture.stance_counts),['中性为主','方向偏多']);
 assert.deepEqual(conclusion({'看多':0,'看空':0,'中性':0,'多空混合':0,'无法判断':10}),['信息不足','方向待判']);
 assert.equal(conclusion({'看多':1,'看空':6,'中性':2,'多空混合':1,'无法判断':0})[1],'方向偏空');
});
test('strict chart counts, safe text and required brand',()=>{
 const d=structuredClone(fixture);d.keyword='<script>&';const svg=renderSvg(d);
 assert(svg.includes('&lt;script&gt;&amp;'));assert(svg.includes('抖音搜索：15682165'));assert(svg.includes('撸西西 | 教AI'));assert(svg.includes('data:image/jpeg;base64,'));
 for(const keyword of ['$&',"$'",'$`']){const literal=renderSvg({...d,keyword});assert(literal.includes(keyword==="$'"?'$&apos;':keyword==='$&'?'$&amp;':keyword));}
 assert.throws(()=>validateReport({...d,posts_in_window:99}),/sum mismatch/);
 d.metrics=null;const unknown=renderSvg(d);assert(unknown.includes('额外付费：未知'));assert(unknown.includes('Token未记录'));assert(!unknown.includes('额外付费 $0'));
});
test('empty frozen run produces a genuine zero-sample report',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rn-empty-'));write(path.join(dir,'run-config.json'),{window_start_utc:fixture.window_start_utc,window_end_utc:fixture.window_end_utc,max_posts:100,max_comments:50,keyword:'美股',timezone:fixture.timezone});
 write(path.join(dir,'progress.json'),{state:'pass_finished'});fs.mkdirSync(path.join(dir,'raw'));fs.writeFileSync(path.join(dir,'posts.jsonl'),'');freezeRun(dir);
 assert.throws(()=>analyzeRun(dir),/Created annotation scaffold/);const report=analyzeRun(dir);assert.equal(report.posts_in_window,0);assert(renderSvg(report).includes('暂无样本'));
});
test('edited configs cannot raise caps or remove pacing',()=>{
 const cfg={max_posts:100,max_comments:50,minimum_gap_ms:3500,host:'www.rednote.com',keyword:'美股',session:'fixture'};assert.equal(validateConfig(cfg),cfg);
 for(const patch of [{max_posts:101},{max_comments:51},{minimum_gap_ms:0},{host:'example.com'}])assert.throws(()=>validateConfig({...cfg,...patch}));
});
test('failed initialization can recover without a new browser session identity',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rn-init-')),scripts=path.join(dir,'scripts');fs.mkdirSync(scripts);
 for(const n of ['init-run.mjs','io.mjs','config.mjs','lease.mjs'])fs.copyFileSync(path.join(base,'scripts',n),path.join(scripts,n));
 fs.writeFileSync(path.join(scripts,'upstream.mjs'),`export class BrowserBridge {async connect(){if(process.env.RN_INIT_FAIL)throw new Error('OFFLINE_CONNECTION_FIXTURE');return {goto:async()=>{},getActivePage:()=> 'offline-owned-tab'};}async close(){}}`);
 const run=path.join(dir,'run'),args=[path.join(scripts,'init-run.mjs'),'--run',run],env={...process.env,TEMP:dir,TMP:dir,TMPDIR:dir};
 const failed=spawnSync(process.execPath,args,{env:{...env,RN_INIT_FAIL:'1'},encoding:'utf8'});assert.notEqual(failed.status,0);const identity=read(path.join(run,'run-config.json')).session;
 const recovered=spawnSync(process.execPath,args,{env,encoding:'utf8'});assert.equal(recovered.status,0,recovered.stderr);assert.equal(read(path.join(run,'run-config.json')).session,identity);assert.equal(read(path.join(run,'session.json')).page,'offline-owned-tab');
});
test('repeat PNG/SVG bytes match and exact 1600x1200 aspect',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rn-render-'));const a=renderReport(fixture,path.join(dir,'a')),b=renderReport(fixture,path.join(dir,'b'));
 assert.equal(a.png_sha256,b.png_sha256);assert.equal(a.svg_sha256,b.svg_sha256);const png=fs.readFileSync(path.join(dir,'a.png'));assert.equal(png.readUInt32BE(16),1600);assert.equal(png.readUInt32BE(20),1200);assert.equal(a.brand_required,true);
});
test('lease excludes concurrent collectors',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rn-lease-')),file=path.join(dir,'lease');const release=acquireLease(file);assert.throws(()=>acquireLease(file),/Another collector/);release();acquireLease(file)();});
test('freeze detects raw mutation; analysis requires reviewed source evidence',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rn-freeze-')),id='000000000000000000000001',stamp=Date.parse(fixture.window_end_utc);
 write(path.join(dir,'run-config.json'),{window_start_utc:fixture.window_start_utc,window_end_utc:fixture.window_end_utc,max_posts:100,max_comments:50,keyword:'美股',timezone:fixture.timezone});
 write(path.join(dir,'progress.json'),{state:'pass_finished'});write(path.join(dir,'raw/details',id+'.json'),{note_metadata:{note:{time:stamp}}});
 const post={note_id:id,title:'微软未来看涨',body:'微软未来看涨',comments:[],published_at:new Date(stamp).toISOString(),published_time_source:'public.note.time',within_24h:true,detail_success:true};
 fs.writeFileSync(path.join(dir,'posts.jsonl'),JSON.stringify(post)+'\n');freezeRun(dir);verifyFreeze(dir);
 assert.throws(()=>analyzeRun(dir),/Created annotation scaffold/);
 write(path.join(dir,'analysis/annotations.json'),[{note_id:id,reviewed:true,stance:'看多',evidence:'未来看涨',stocks:[{ticker:'MSFT',name:'微软',asset_type:'stock',stance:'看多',evidence:'微软未来看涨'}]}],false);
 const report=analyzeRun(dir);assert.equal(report.posts_in_window,1);assert.equal(report.stock_ranking[0].posts,1);assert.equal(report.timeline[11],1);
 fs.appendFileSync(path.join(dir,'raw/details',id+'.json'),' ');assert.throws(()=>verifyFreeze(dir),/Raw changed/);
});
