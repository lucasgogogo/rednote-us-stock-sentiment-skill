// Copyright (C) 2026 lucasgogogo — https://github.com/lucasgogogo/rednote-us-stock-sentiment-skill
// SPDX-License-Identifier: AGPL-3.0-only
// Author-attribution notice: see ATTRIBUTION.md (AGPL section 7(b)).
export function estimate(usage,pricing){
 if(usage==null)return null;
 const keys=['input_tokens','cached_input_tokens','cache_write_input_tokens','output_tokens'];
 for(const k of keys)if(!Number.isSafeInteger(usage[k])||usage[k]<0)throw new Error('Invalid usage '+k);
 const uncached=usage.input_tokens-usage.cached_input_tokens-usage.cache_write_input_tokens;
 if(uncached<0)throw new Error('Cached/write tokens exceed total input');
 const p=pricing.per_million;
 for(const k of ['input','cached_input','cache_write_input','output'])if(!Number.isFinite(p[k])||p[k]<0)throw new Error('Invalid price');
 return {total_tokens:usage.input_tokens+usage.output_tokens,uncached_input:uncached,usd:(uncached*p.input+usage.cached_input_tokens*p.cached_input+usage.cache_write_input_tokens*p.cache_write_input+usage.output_tokens*p.output)/1e6};
}
