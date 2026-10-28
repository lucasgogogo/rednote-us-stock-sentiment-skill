// Deterministic rendering of the approved 4:3 layout; no generative image API.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Resvg} from '@resvg/resvg-js';
import {read,write,arg} from './io.mjs';
import {categories,conclusion} from './analyze.mjs';
import {estimate} from './cost.mjs';
const base=fileURLToPath(new URL('../',import.meta.url));
const asset=relative=>path.join(base,'assets',relative);
const C=['#f53d48','#00a99e','#86a9ca','#ffbf36','#a58af0'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const text=(x,y,s,size=24,weight=400,fill='#07183e',anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;
const rect=(x,y,w,h,fill,stroke='none')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}"/>`;
const image=(file,x,y,w,h)=>{if(file.endsWith('.svg'))return fs.readFileSync(file,'utf8').replace('<svg',`<svg x="${x}" y="${y}" width="${w}" height="${h}"`);const type=file.endsWith('.jpg')?'image/jpeg':'image/png';return `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" href="data:${type};base64,${fs.readFileSync(file).toString('base64')}"/>`;};
const short=(s,n)=>[...String(s)].length>n?[...String(s)].slice(0,n-1).join('')+'…':String(s);
const compact=n=>n>=10000?(n/10000).toLocaleString('en-US',{maximumFractionDigits:0})+'万':n.toLocaleString('en-US');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
export function validateReport(d){
 if(d.schema_version!=='1.0')throw new Error('Unsupported schema_version');
 const integer=n=>Number.isSafeInteger(n)&&n>=0;
 if(!integer(d.posts_in_window)||d.posts_in_window>100||!integer(d.primary_comments_exported)||!Number.isInteger(d.max_comments_per_post)||d.max_comments_per_post<1||d.max_comments_per_post>50||d.primary_comments_exported>d.posts_in_window*d.max_comments_per_post)throw new Error('Invalid sample counts');
 if(categories.some(c=>!integer(d.stance_counts?.[c]))||categories.reduce((n,c)=>n+d.stance_counts[c],0)!==d.posts_in_window)throw new Error('Stance sum mismatch');
 if(!Array.isArray(d.timeline)||d.timeline.length!==12||d.timeline.some(n=>!integer(n))||d.timeline.reduce((a,b)=>a+b,0)!==d.posts_in_window)throw new Error('Timeline sum mismatch');
 if(!Number.isFinite(Date.parse(d.window_start_utc))||Date.parse(d.window_end_utc)-Date.parse(d.window_start_utc)!==86400000)throw new Error('Expected a fixed 24-hour window');
 new Intl.DateTimeFormat('en-US',{timeZone:d.timezone});
 if(!Array.isArray(d.stock_ranking))throw new Error('Missing stock ranking');
 for(const s of d.stock_ranking){if(!/^[A-Za-z0-9.\-]{1,16}$/.test(s.ticker)||!integer(s.posts)||s.posts>d.posts_in_window||categories.some(c=>!integer(s.post_stance_counts?.[c]))||categories.reduce((n,c)=>n+s.post_stance_counts[c],0)!==s.posts)throw new Error('Invalid stock counts');}
 if(d.metrics?.elapsed_seconds!=null&&(!Number.isFinite(d.metrics.elapsed_seconds)||d.metrics.elapsed_seconds<0))throw new Error('Invalid elapsed time');
 if(d.metrics?.billing?.extra_usd!=null&&(!Number.isFinite(d.metrics.billing.extra_usd)||d.metrics.billing.extra_usd<0||!d.metrics.billing.source))throw new Error('Billing value needs a measurement/source');
 return d;
}
export function renderSvg(input){
 const d=validateReport(input),pricing=read(asset('pricing.json')),cost=estimate(d.metrics?.usage,pricing);
 const brand=read(asset('brand/brand.json'));
 if(brand.required!==true||brand.name!=='撸西西 | 教AI'||brand.douyin_id!=='15682165'||!fs.existsSync(asset('brand/luxixi-avatar.jpg')))throw new Error('Required creator brand missing');
 if(digest(fs.readFileSync(asset('brand/luxixi-avatar.jpg')))!==brand.avatar_sha256)throw new Error('Creator avatar differs from the approved original');
 const date=ms=>new Intl.DateTimeFormat('sv-SE',{timeZone:d.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms));
 const start=Date.parse(d.window_start_utc),N=d.posts_in_window;
 const fields={};
 fields.HEADER=text(32,45,'Rednote 美股舆情 · 24小时样本'+(d.demo?' · 演示数据':''),29,700)+text(1568,44,`${date(start)} — ${date(d.window_end_utc)} · ${d.timezone}`,17,400,'#23395c','end');
 fields.METRICS=text(145,207,String(N),142,900)+text(430,187,'篇帖子',46,700)+text(875,207,String(d.primary_comments_exported),142,900)+text(1240,178,'条一级留言',42,700)+text(1240,215,`每帖最多${d.max_comments_per_post}条一级留言`,20)+`<path d="M790 92v120" stroke="#ccddee"/>`;
 fields.SENTIMENT=text(44,291,'文字观点分布',31,700);
 let offset=0;const cx=237,cy=476,r=140,total=2*Math.PI*r;
 fields.SENTIMENT+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#edf2f8" stroke-width="66"/>`;
 categories.forEach((cat,i)=>{
  const count=d.stance_counts[cat],portion=N?count/N:0,length=portion*total;
  if(count){fields.SENTIMENT+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C[i]}" stroke-width="66" stroke-dasharray="${length} ${total-length}" stroke-dashoffset="${-offset*total}" transform="rotate(-90 ${cx} ${cy})"/>`;
   const a=(offset+portion/2)*2*Math.PI-Math.PI/2,x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);
   if(portion>=.05)fields.SENTIMENT+=text(x,y+8,(portion*100).toFixed(portion*100%1?1:0)+'%',25,700,'white','middle');
  }offset+=portion;
  const y=350+i*59;
  fields.SENTIMENT+=`<circle cx="460" cy="${y-10}" r="16" fill="${C[i]}"/>`+text(490,y,cat,i<2?30:27,i<2?700:400)+text(830,y,`${count}篇 · ${N?(count/N*100).toFixed(count/N*100%1?1:0):0}%`,i<2?30:25,i<2?700:400,i<2?C[i]:'#07183e','end');
 });
 const lines=N?conclusion(d.stance_counts):['暂无样本','方向待判'];
 fields.SENTIMENT+=text(cx,468,lines[0],31,700,'#07183e','middle')+text(cx,512,lines[1],31,700,lines[1]==='方向偏多'?C[0]:lines[1]==='方向偏空'?C[1]:'#07183e','middle');
 fields.STOCKS=text(894,291,'讨论最多的三只股票',31,700)+text(1553,321,'按去重提及帖数排名',18,400,'#526887','end');
 const ranking=[...d.stock_ranking].sort((a,b)=>b.posts-a.posts||a.ticker.localeCompare(b.ticker)).slice(0,3);
 for(let i=0;i<3;i++){
  const y=337+i*111,s=ranking[i];fields.STOCKS+=rect(892,y,664,101,'#fafcff','#e4edf6');
  if(!s){fields.STOCKS+=text(920,y+57,'暂无可核实个股',24);continue;}
  fields.STOCKS+=text(909,y+46,String(i+1),30,700);
  const candidate=['png','svg'].map(e=>asset(`logos/${s.ticker}.${e}`)).find(fs.existsSync);
  fields.STOCKS+=candidate?image(candidate,955,y+13,100,75):text(1000,y+55,s.ticker,19,700,'#526887','middle');
  fields.STOCKS+=text(1072,y+39,short(s.name,11),26,700)+text(1538,y+39,`${s.posts}篇提及`,32,700,'#07183e','end');
  const c=s.post_stance_counts;
  fields.STOCKS+=text(1072,y+76,`多${c['看多']} · 空${c['看空']} · 中性${c['中性']} · 混合${c['多空混合']} · 待判${c['无法判断']}`,18);
 }
 fields.TIMELINE=text(44,748,'样本发帖节奏',31,700)+text(320,747,'真实发布时间 · 每2小时样本帖数',20,400,'#526887');
 const x0=90,y0=956,w=714,h=155,max=Math.max(10,...d.timeline),scale=Math.ceil(max/10)*10;
 for(const v of [0,scale/2,scale]){const y=y0-v/scale*h;fields.TIMELINE+=`<path d="M${x0} ${y}h${w}" stroke="#d4e3f3" stroke-dasharray="5 4"/>`+text(75,y+6,String(v),19,400,'#526887','end');}
 const pts=d.timeline.map((n,i)=>[x0+i*w/11,y0-n/scale*h]);
 fields.TIMELINE+=`<path d="M${x0} ${y0}L${pts.map(p=>p.join(' ')).join('L')}L${x0+w} ${y0}Z" fill="#e9f3fd"/><polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#174c87" stroke-width="3"/>`;
 pts.forEach(([x,y],i)=>{fields.TIMELINE+=`<circle cx="${x}" cy="${y}" r="5" fill="#174c87"/>`;if(d.timeline[i]>=5)fields.TIMELINE+=text(x,y-12,d.timeline[i],20,700,'#07183e','middle');});
 for(const i of [0,4,8,11]){const label=date(start+(i+1)*7200000);fields.TIMELINE+=text(pts[i][0],989,label.slice(11,16),18,400,'#07183e','middle')+text(pts[i][0],1013,label.slice(5,10).replace('-','/'),17,400,'#526887','middle');}
 fields.TIMELINE+=text(440,1045,'仅为本次样本的时间分布，非全站发帖量',19,400,'#526887','middle');
 const m=d.metrics,elapsed=m?.elapsed_seconds==null?'耗时未记录':`约${Math.round(m.elapsed_seconds/60)}分钟`;
 fields.COSTS=text(894,748,'执行与费用',31,700)+rect(894,767,318,91,'#f5faff','#e1ecf7')+rect(1222,767,332,91,'#f5faff','#e1ecf7');
 fields.COSTS+=text(913,808,elapsed,34,700)+text(913,839,'本轮总耗时',19)+text(1238,804,cost?`${compact(cost.total_tokens)} tokens`:'Token未记录',29,700)+text(1238,834,cost?`缓存读取${compact(m.usage.cached_input_tokens)}`:'缺失记录不按零计',18);
 fields.COSTS+=rect(894,869,660,81,'#fff7ee','#ffd6ae')+text(912,899,pricing.model+' API折算',22,700)+text(912,933,cost?'≈ $'+cost.usd.toFixed(2):'未记录，无法折算',33,700,'#bd4c12')+text(1534,929,'输入、缓存、输出分别计价',18,400,'#526887','end');
 fields.COSTS+=rect(894,962,660,86,'#eefcf2','#b8e6c8');
 const billing=m?.billing,quota=m?.quota;
 fields.COSTS+=text(911,991,billing?.plan?`实际使用：${short(billing.plan,17)}`:'实际使用：计费方式未记录',22,700,'#075d42');
 const q=quota?.same_window===true&&[quota.before,quota.after].every(x=>Number.isFinite(x)&&x>=0&&x<=100)?`同期账户周额度${quota.before}%→${quota.after}%（${quota.after-quota.before>=0?'+':''}${quota.after-quota.before}个百分点）`:'周额度变化未记录';
 fields.COSTS+=text(911,1030,q,17,400,'#075d42')+text(1535,997,billing?.extra_usd==null?'额外付费：未知':`额外付费 $${billing.extra_usd}`,28,700,'#075d42','end');
 fields.FOOTER=text(42,1107,`来源：${short(d.source,25)} · 关键词「${short(d.keyword,12)}」· 最新排序；仅为本次文字样本。`,17)+text(42,1134,'非全站普查；未解析图片和视频。耗时含等待、采集与分析，不含制图。',17)+text(42,1161,'API为等量折算；账户周额度为共享指标，不能精确归因于单次任务。'+(d.demo?' 演示数据。':''),16);
 fields.BRAND=image(asset('brand/luxixi-avatar.jpg'),1099,1093,70,70)+image(asset('brand/douyin.svg'),1182,1098,28,28)+text(1220,1121,'抖音搜索：15682165',24,700)+text(1182,1159,'撸西西 | 教AI',29,700);
 let svg=fs.readFileSync(asset('report-template.svg'),'utf8');for(const [key,value] of Object.entries(fields))svg=svg.replace(`{{${key}}}`,()=>value);
 if(/\{\{[A-Z]+\}\}/.test(svg))throw new Error('Unfilled template slot');return svg;
}
export function renderReport(input,output){
 const svg=renderSvg(input),fontFiles=fs.readdirSync(asset('fonts')).filter(n=>n.startsWith('LuxixiReportSans-')&&n.endsWith('.ttf')).sort().map(n=>asset('fonts/'+n));
 if(!fontFiles.length)throw new Error('Bundled font missing');
 const png=new Resvg(svg,{font:{fontFiles,loadSystemFonts:false,defaultFontFamily:'Luxixi Report Sans'},fitTo:{mode:'original'}}).render().asPng();
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output+'.svg',svg);fs.writeFileSync(output+'.png',png);
 const manifest={template:'approved-4x3-brand-v1',width:1600,height:1200,brand_required:true,brand_name:'撸西西 | 教AI',douyin_id:'15682165',avatar_sha256:digest(fs.readFileSync(asset('brand/luxixi-avatar.jpg'))),svg_sha256:digest(svg),png_sha256:digest(png)};
 write(output+'.manifest.json',manifest,false);return manifest;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(renderReport(read(arg('--input',true)),path.resolve(arg('--output',true)))));
