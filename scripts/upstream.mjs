// Copyright (C) 2026 lucasgogogo — https://github.com/lucasgogogo/rednote-us-stock-sentiment-skill
// SPDX-License-Identifier: AGPL-3.0-only
// Author-attribution notice: see ATTRIBUTION.md (AGPL section 7(b)).
// OpenCLI is imported unchanged, pinned to 2.0.2. See references/PROVENANCE.md.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.resolve('@jackwener/opencli')));
if(JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version!=='2.0.2')throw new Error('Expected OpenCLI 2.0.2; revalidate internal exports before upgrading');
const up=relative=>import(pathToFileURL(path.join(root,relative)).href);
export const {BrowserBridge}=await up('dist/src/browser/index.js');
export const {buildScrollHarvestJs}=await up('clis/xiaohongshu/search.js');
export const {NOTE_EXTRACT_JS}=await up('clis/xiaohongshu/note.js');
export const {buildCommentsExtractJs,normalizeCommentRows,assertCommentsLoaded,parseXhsLikeCountText}=await up('clis/xiaohongshu/comments.js');
