// Copyright (C) 2026 lucasgogogo — https://github.com/lucasgogogo/rednote-us-stock-sentiment-skill
// SPDX-License-Identifier: AGPL-3.0-only
// Author-attribution notice: see ATTRIBUTION.md (AGPL section 7(b)).
import fs from 'node:fs';
import path from 'node:path';
export const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
export function write(file,value,exclusive=true){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:exclusive?'wx':'w'});}
export const rows=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
export function arg(key,required=false){const i=process.argv.indexOf(key);if(i<0){if(required)throw new Error('Missing '+key);return null;}const value=process.argv[i+1];if(!value||value.startsWith('--'))throw new Error('Missing value for '+key);return value;}
export const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
