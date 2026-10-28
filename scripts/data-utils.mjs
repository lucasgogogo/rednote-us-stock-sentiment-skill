// Copyright (C) 2026 lucasgogogo — https://github.com/lucasgogogo/rednote-us-stock-sentiment-skill
// SPDX-License-Identifier: AGPL-3.0-only
// Author-attribution notice: see ATTRIBUTION.md (AGPL section 7(b)).
export function realTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const ms = value < 1e11 ? value * 1000 : value;
    if (ms < Date.UTC(2000,0,1) || ms > Date.UTC(2100,0,1)) return null;
    return new Date(ms).toISOString();
  }
  if (typeof value === 'string' && /^\d{10}(?:\d{3})?$/.test(value)) return realTimestamp(Number(value));
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  return null;
}
export function inWindow(iso, cfg) {
  if (!iso) return null;
  return Date.parse(iso) >= Date.parse(cfg.window_start_utc) && Date.parse(iso) <= Date.parse(cfg.window_end_utc);
}
export function noteIdFromUrl(url) {
  try {
    const u = new URL(url);
    if (!['rednote.com','www.rednote.com'].includes(u.hostname)) return null;
    return u.pathname.match(/^\/(?:explore|search_result|note)\/([a-f0-9]{24})(?:\/|$)/i)?.[1].toLowerCase() || null;
  } catch { return null; }
}
export function mergeSearchRows(acc, rows, cap=100) {
  for (const row of rows) {
    const id = noteIdFromUrl(row.url);
    if (!id || (!acc.has(id) && acc.size >= cap)) continue;
    const prev = acc.get(id) || {};
    acc.set(id, {...prev, ...row, note_id:id});
  }
  return acc;
}

export function commentEndReached() {
  const end=document.querySelector('.comments-container .end-container');
  return !!end && end.getBoundingClientRect().height>0 && getComputedStyle(end).display!=='none' && /THE\s*END/i.test(end.textContent||'');
}

export function addCommentEndGuard(code) {
  const marker='if (loadedEnough(beforeCount)) break';
  if(!code.includes(marker))throw new Error('Upstream comment loop changed');
  return code.replace(marker,`if (loadedEnough(beforeCount) || (${commentEndReached.toString()})()) break`);
}

// Only project the current public note, never current-user/session state.
export function extractPublicNote(noteId) {
  const unwrap = x => x && typeof x === 'object' && ('_value' in x || ('value' in x && x.__v_isRef)) ? (x._value ?? x.value) : x;
  const state = window.__INITIAL_STATE__ || {};
  const noteState = unwrap(state.note) || {};
  const maps = [['window.__INITIAL_STATE__.note.noteDetailMap', unwrap(noteState.noteDetailMap)]];
  let selected = null, source = null;
  for (const [base, map] of maps) {
    if (!map || typeof map !== 'object') continue;
    for (const [key, item] of Object.entries(map)) {
      const entry = unwrap(item);
      const candidate = unwrap(entry?.note) || entry;
      const id = candidate?.noteId || candidate?.note_id || candidate?.id;
      if ((key === noteId || id === noteId) && (!id || id === noteId)) {
        selected = candidate;
        source = base + '[' + JSON.stringify(key) + '].note';
        break;
      }
    }
    if (selected) break;
  }
  const note = {};
  if (selected) {
    for (const key of ['noteId','note_id','id','title','desc','type','time','lastUpdateTime','user','interactInfo','imageList','video','tagList','ipLocation']) {
      if (selected[key] !== undefined) note[key] = selected[key];
    }
  }
  const scope = document.querySelector('#noteContainer');
  const dateElements = scope ? [...scope.querySelectorAll('.date, .time, time, [datetime]')].filter(e => !e.closest('.comments-container')) : [];
  const dates = dateElements.slice(0,8).map(e=>({text:e.textContent?.trim() || '',datetime:e.getAttribute('datetime'),title:e.getAttribute('title')}));
  return {note, state_source:source, dom_dates:dates,
    diagnostic:{note_state_keys:Object.keys(noteState).filter(k=>!/(user|token|auth|cookie|session)/i.test(k)).slice(0,25),
      detail_map_keys:maps[0][1] && typeof maps[0][1]==='object' ? Object.keys(maps[0][1]).slice(0,5) : []}};
}

export const PAGE_GUARD_JS = `(() => {
  const text=document.body?.innerText || '';
  const visible=e=>!!e && e.getBoundingClientRect().width>0 && e.getBoundingClientRect().height>0 && getComputedStyle(e).display!=='none';
  const auth=/电脑设备登录超限|登录后查看搜索结果|请重新登录|请登录/.test(text) || visible(document.querySelector('.login-container'));
  const security=/请求太频繁|访问频次异常|安全限制|访问链接异常|Requests too frequent|Scan with logged-in/i.test(text) || location.pathname.startsWith('/website-login/captcha');
  return {auth,security,url:location.href,notice:(auth||security)?text.slice(0,700):null};
})()`;
