import fs from 'node:fs';
import {realTimestamp,PAGE_GUARD_JS} from './data-utils.mjs';
import {parseXhsLikeCountText} from './upstream.mjs';

export async function collectPublicComments(page,nid,root,max=50,options={}) {
  const dir=`${root}/raw/comments-structured/${nid}/${Date.now()}`;
  fs.mkdirSync(dir,{recursive:true});
  const sleep=options.sleep||((ms)=>new Promise(r=>setTimeout(r,ms)));
  const snapshot=()=>page.evaluate(`(() => {
    const id=${JSON.stringify(nid)};
    if(!location.pathname.includes(id))throw new Error('Target note changed');
    const e=window.__INITIAL_STATE__?.note?.noteDetailMap?.[id];
    const s=document.querySelector('.note-scroller'),r=s?.getBoundingClientRect();
    let owner=null;
    for(let e=s;e;e=e.parentElement){if(e.clientHeight>0&&e.scrollHeight>e.clientHeight+4&&/auto|scroll/.test(getComputedStyle(e).overflowY)){owner=e;break;}}
    owner=owner||document.scrollingElement||document.documentElement;
    return {note_id:id,comments:e?.comments||null,visibility:document.visibilityState,
      geometry:s?{owner_class:owner.className||owner.tagName,top:owner.scrollTop,height:owner.clientHeight,scroll_height:owner.scrollHeight,x:Math.max(20,Math.min(innerWidth-20,r.right-100)),y:Math.max(20,Math.min(innerHeight-30,r.bottom-50))}:null};
  })()`);
  const acc=new Map();let current=null,previousSize=0,previousGeometry=null,idle=0,stop='round_cap';
  for(let round=0;round<12;round++) {
    const guard=await page.evaluate(PAGE_GUARD_JS);
    if(guard.auth||guard.security)throw new Error(guard.security?'STOP_SECURITY':'STOP_AUTH');
    current=await snapshot();
    fs.writeFileSync(`${dir}/step-${String(round).padStart(2,'0')}.json`,JSON.stringify({captured_at:new Date().toISOString(),...current},null,2)+'\n',{flag:'wx'});
    const state=current.comments;
    if(!state || !Array.isArray(state.list))throw new Error('PUBLIC_COMMENTS_STATE_MISSING');
    for(const c of state.list){if(c.id&&!acc.has(c.id))acc.set(c.id,c);}
    if(acc.size>=max){stop='limit_'+max;break;}
    if(state.firstRequestFinish&&!state.loading&&!state.hasMore){stop='end_of_primary_comments';break;}
    if(state.loading||!state.firstRequestFinish){await sleep(3500);continue;}
    if(current.visibility!=='visible')throw new Error('NEEDS_VISIBLE_PAGE');
    const g=current.geometry;if(!g||g.height<=0)throw new Error('COMMENT_SCROLLER_MISSING');
    const geometryChanged=!previousGeometry||g.top!==previousGeometry.top||g.height!==previousGeometry.height||g.scroll_height!==previousGeometry.scroll_height;
    if(round>0 && acc.size===previousSize&&!geometryChanged)idle++;else idle=0;
    if(idle>=3){stop='load_stalled_with_more';break;}
    previousSize=acc.size;
    previousGeometry=g;
    const delta=Math.max(900,Math.min(3500,g.scroll_height-g.height-g.top+150));
    await page.cdp('Input.dispatchMouseEvent',{type:'mouseWheel',x:g.x,y:g.y,deltaX:0,deltaY:delta});
    await sleep(3500);
  }
  const chosen=[...acc.values()].slice(0,max);
  const results=chosen.map(c=>({id:c.id,author:c.userInfo?.nickname||c.userInfo?.nickName||'',userId:c.userInfo?.userId||null,
    text:c.content||'',likes:parseXhsLikeCountText(c.likeCount),time:realTimestamp(c.createTime),createTime:c.createTime,
    is_reply:false,reply_to:'',images:c.pictures||[],sub_comment_count:c.subCommentCount??null}));
  const result={note_id:nid,source:'target_public_note_comments_state_and_visible_native_wheel',results,
    raw_primary_observed:acc.size,raw_nested_count:chosen.reduce((sum,c)=>sum+(c.subComments?.length||0),0),
    hasMore:current?.comments?.hasMore??null,stop_reason:stop,raw_steps_dir:dir,captured_at:new Date().toISOString()};
  fs.writeFileSync(`${dir}/final.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  return result;
}
