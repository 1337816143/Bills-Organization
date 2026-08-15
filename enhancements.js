(()=>{'use strict';
const B=window.BO;if(!B)return;

const LABELS={
  prep:'旅游前准备支出',
  during_travel:'旅游期间旅游支出',
  during_nontravel:'旅游期间非旅游支出',
  other:'非旅游 / 其他'
};
const LEGACY_TO_NEW=(r)=>{
  if(r.manualClass==='travel')return B.dateOnly(r.time)<(B.state.settings.travelStart||'2026-08-08')?'prep':'during_travel';
  if(r.manualClass==='period_nontravel')return'during_nontravel';
  if(r.manualClass==='other')return'other';
  return null;
};
const NEW_TO_LEGACY=c=>c==='prep'||c==='during_travel'?'travel':c==='during_nontravel'?'period_nontravel':c==='other'?'other':'unknown';
B.travelLabels=LABELS;
B.state.settings.travelEnd=B.state.settings.travelEnd||'2026-08-14';

B.timePrecision=s=>{
  s=String(s||'').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return'仅日期';
  if(/\d{2}:\d{2}:\d{2}\.\d+/.test(s))return'毫秒';
  if(/\d{2}:\d{2}:\d{2}/.test(s))return'秒';
  if(/\d{2}:\d{2}/.test(s))return'分钟';
  return s?'原始精度':'未知';
};
B.timeInterval=s=>{
  const x=String(s||'').trim(),m=x.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?/);
  if(!m)return[Number.NEGATIVE_INFINITY,Number.POSITIVE_INFINITY];
  const y=+m[1],mo=+m[2]-1,d=+m[3],h=m[4]==null?0:+m[4],mi=m[5]==null?0:+m[5],se=m[6]==null?0:+m[6],ms=m[7]==null?0:+String(m[7]).padEnd(3,'0').slice(0,3);
  const min=new Date(y,mo,d,h,mi,se,ms).getTime();
  let max=min;
  if(m[4]==null)max=new Date(y,mo,d,23,59,59,999).getTime();
  else if(m[6]==null)max=new Date(y,mo,d,h,mi,59,999).getTime();
  else if(m[7]==null)max=min+999;
  return[min,max];
};
B.rangeTs=v=>{
  if(!v)return null;
  const s=String(v).replace('T',' ');
  const [a]=B.timeInterval(s.includes(':')?s:`${s} 00:00:00`);
  return a;
};
B.inTimeRange=(r,from,to)=>{
  const [a,b]=B.timeInterval(r.time),f=from?B.rangeTs(from):null,t=to?B.rangeTs(to):null;
  return(f==null||b>=f)&&(t==null||a<=t);
};
B.during=r=>{
  const d=B.dateOnly(r.time),s=B.state.settings.travelStart||'2026-08-08',e=B.state.settings.travelEnd||'9999-12-31';
  return!!d&&d>=s&&d<=e;
};

const prepRx=/酒店|民宿|机票|火车票|铁路|12306|高铁|航班|机场|轮渡|船票|景区|门票|旅行|旅游|飞猪|携程|去哪儿|同程|行李|旅行箱|拉杆箱|行李锁|泳衣|泳裤|比基尼|防晒|遮阳|充电宝|转换插头|旅行装|洗漱包|收纳包/;
const travelRx=/酒店|民宿|住宿|机票|火车票|铁路|12306|高铁|航班|机场|轮渡|船票|景区|门票|打车|出租|滴滴|高德|公交|地铁|轨道|交通卡|餐饮|餐厅|饭店|小吃|烧烤|海鲜|咖啡|茶饮|便利店|超市|商店|旅行|旅游|飞猪|携程|去哪儿|同程/;
const nonTravelRx=/话费|手机充值|游戏|点券|会员|网课|课程|培训|考试|资料|基金|理财|证券|股票|ETF|余额宝|零钱通|花呗|信用卡还款|借款|贷款|黄金|首饰|珠宝|礼物|办公软件|云服务|网盘/;
const onlineRx=/淘宝|天猫|京东|拼多多|唯品会|得物|抖音商城|快手小店/;
const neutralEcon=new Set(['理财/资产调拨','内部资金调拨','还款/债务结算','内部/中性交易']);

B.autoTravel=r=>{
  const start=B.state.settings.travelStart||'2026-08-08',end=B.state.settings.travelEnd||'9999-12-31',d=B.dateOnly(r.time);
  const text=B.norm([r.category,r.counterparty,r.description,r.paymentMethod,r.economicClass,JSON.stringify(r.raw||{})].join(' '));
  const seed=String(r.travelSeed||'');
  if(seed.includes('旅游准备'))return{code:'prep',confidence:seed.includes('明确')?'高':'中',reason:`沿用旧版“${seed}”线索；自动结果仍需人工复核`};
  if(seed.includes('旅游期间'))return{code:'during_travel',confidence:seed.includes('明确')?'高':'中',reason:`沿用旧版“${seed}”线索；自动结果仍需人工复核`};
  if(seed==='非旅游'&&d>=start&&d<=end)return{code:'during_nontravel',confidence:'中',reason:'旧版判断为非旅游，且交易发生在设定的旅行期间'};
  if(neutralEcon.has(r.economicClass))return{code:'other',confidence:'高',reason:`${r.economicClass||'中性交易'}不作为旅游消费自动计入`};
  if(!d)return{code:'other',confidence:'低',reason:'缺少可用日期，无法可靠判断与旅行时间的关系'};
  if(d<start){
    const days=(B.timeInterval(start)[0]-B.timeInterval(d)[0])/86400000;
    if(days>=0&&days<=45&&prepRx.test(text))return{code:'prep',confidence:/酒店|民宿|机票|火车票|12306|门票|轮渡/.test(text)?'高':'中',reason:'旅行开始前45天内，交易内容命中住宿/交通/门票/旅行用品等准备关键词'};
    return{code:'other',confidence:'中',reason:'发生在旅行开始前，且未命中明显的旅行准备关键词'};
  }
  if(d>=start&&d<=end){
    if(nonTravelRx.test(text))return{code:'during_nontravel',confidence:'高',reason:'发生在旅行期间，但命中话费、游戏、课程、理财、还款、首饰等非旅游关键词'};
    if(travelRx.test(text))return{code:'during_travel',confidence:/酒店|民宿|机票|火车票|12306|打车|地铁|公交|景区|门票/.test(text)?'高':'中',reason:'发生在旅行期间，并命中住宿、交通、餐饮、便利消费或景点等旅游场景关键词'};
    if(onlineRx.test(text))return{code:'during_nontravel',confidence:'低',reason:'旅行期间发生的普通网购缺少旅游用途证据，暂归非旅游；此类自动识别最容易出错'};
    if(r.direction==='支出'||B.isRefund(r))return{code:'during_travel',confidence:'低',reason:'交易发生在旅行期间且属于消费/退款，但缺少明确用途证据，暂按旅游消费归类'};
    return{code:'during_nontravel',confidence:'低',reason:'发生在旅行期间，但没有足够旅游消费证据'};
  }
  return{code:'other',confidence:'高',reason:'交易发生在设定的旅行结束日期之后'};
};

B.manualSelection=r=>{
  if(r.manualOverride)return r.manualOverride;
  const legacy=LEGACY_TO_NEW(r);
  return legacy||'auto';
};
B.finalTravelClass=r=>{
  const mv=B.manualSelection(r);
  return mv==='auto'?B.autoTravel(r).code:mv;
};
B.finalTravelLabel=r=>LABELS[B.finalTravelClass(r)]||'非旅游 / 其他';
B.autoTravelLabel=r=>LABELS[B.autoTravel(r).code]||'非旅游 / 其他';
B.classOptions=r=>{
  const selected=B.manualSelection(r);
  return[
    ['auto','跟随自动识别'],
    ['prep','旅游前准备支出'],
    ['during_travel','旅游期间旅游支出'],
    ['during_nontravel','旅游期间非旅游支出'],
    ['other','非旅游 / 其他']
  ].map(([v,l])=>`<option value="${v}" ${selected===v?'selected':''}>${l}</option>`).join('');
};

B.invalidateInclusion=()=>{B._dupContext=null;B._includeMap=null;};
B.detailScore=r=>{
  let s=0;if(['微信','支付宝'].includes(r.source))s+=4;if(r.description)s+=2;if(r.counterparty)s+=2;if(r.paymentMethod)s+=1;
  const raw=Object.keys(r.raw||{}).length;s+=Math.min(raw,5)*.2;return s;
};
B.buildDupContext=()=>{
  const records=B.state.records||[],keyById=new Map(),groups=new Map();
  const add=(k,r)=>{keyById.set(r.id,k);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);};
  records.forEach(r=>{if(r.duplicateGroup)add(`G:${r.duplicateGroup}`,r);});
  const suspects=records.filter(r=>r.duplicateStatus==='suspected'&&!r.duplicateGroup&&!keyById.has(r.id));
  const used=new Set();
  for(let i=0;i<suspects.length;i++){
    const a=suspects[i];if(used.has(a.id))continue;let best=null,score=0;
    for(let j=i+1;j<suspects.length;j++){
      const b=suspects[j];if(used.has(b.id))continue;
      const s=typeof B.matchScore==='function'?B.matchScore(a,b):0;
      const fallback=Math.abs((a.amount||0)-(b.amount||0))<.009&&B.dateOnly(a.time)===B.dateOnly(b.time)&&a.source!==b.source?3:0;
      if(Math.max(s,fallback)>score){score=Math.max(s,fallback);best=b}
    }
    if(best&&score>=3){
      const k=`V:SUS-${B.hash([a.id,best.id].sort().join('|'))}`;add(k,a);add(k,best);used.add(a.id);used.add(best.id);
    }
  }
  records.forEach(r=>{if(!keyById.has(r.id))add(`I:${r.id}`,r);});
  B._dupContext={keyById,groups};return B._dupContext;
};
B.dupContext=()=>B._dupContext||B.buildDupContext();
B.refreshInclusion=()=>{
  const {groups}=B.dupContext(),m=new Map();
  groups.forEach((rows,key)=>{
    const isDup=rows.length>1||rows.some(r=>r.duplicateStatus&&r.duplicateStatus!=='');
    const hasBank=rows.some(r=>/银行$/.test(r.source)),hasWallet=rows.some(r=>['微信','支付宝'].includes(r.source));
    rows.forEach(r=>{
      let v;
      if(typeof r.includeOverride==='boolean')v=r.includeOverride;
      else if(r.duplicateStatus==='confirmed-drop')v=false;
      else if(r.duplicateStatus==='confirmed-keep')v=true;
      else if(isDup&&rows.some(x=>x.duplicateStatus==='suspected')){
        if(hasBank&&hasWallet)v=['微信','支付宝'].includes(r.source);
        else{
          const best=[...rows].sort((a,b)=>B.detailScore(b)-B.detailScore(a)||String(a.time).localeCompare(String(b.time)))[0];
          v=r.id===best.id;
        }
      }else v=true;
      m.set(r.id,v);
    });
  });
  B._includeMap=m;return m;
};
B.isIncluded=r=>(B._includeMap||B.refreshInclusion()).get(r.id)!==false;
B.isDrop=r=>!B.isIncluded(r);
B.duplicateKey=r=>B.dupContext().keyById.get(r.id)||`I:${r.id}`;

B.recomputeRefunds=()=>{
  B.refreshInclusion();B.state.refundOffsetIds=new Set();
  const rows=B.state.records.filter(B.isIncluded).slice().sort((a,b)=>String(a.time).localeCompare(String(b.time))),pool=new Map(),used=new Map(),key=r=>`${r.source}|${B.norm(r.counterparty)}`;
  for(const r of rows){
    const k=key(r);
    if(r.direction==='支出'&&!B.isRefund(r))pool.set(k,(pool.get(k)||0)+Math.abs(r.amount||0));
    else if(r.direction!=='收入'&&B.isRefund(r)){
      const avail=(pool.get(k)||0)-(used.get(k)||0);
      if(avail+.009>=Math.abs(r.amount||0)){B.state.refundOffsetIds.add(r.id);used.set(k,(used.get(k)||0)+Math.abs(r.amount||0))}
    }
  }
};

B.filtered=()=>{
  const q=B.norm(B.$('q').value).toLowerCase(),src=B.$('sourceFilter').value,dir=B.$('directionFilter').value,mc=B.$('manualFilter').value,from=B.$('dateFrom').value,to=B.$('dateTo').value;
  return B.state.records.filter(r=>{
    if(B.state.mode==='included'&&!B.isIncluded(r))return false;
    if(src&&r.source!==src||dir&&r.direction!==dir)return false;
    if(mc&&B.finalTravelClass(r)!==mc)return false;
    const d=B.dateOnly(r.time);if(from&&d<from||to&&d>to)return false;
    if(q){
      const a=B.autoTravel(r);
      const hay=[r.id,r.time,r.source,r.direction,r.category,r.counterparty,r.description,r.paymentMethod,r.status,r.economicClass,r.duplicateNote,r.duplicateGroup,B.autoTravelLabel(r),B.finalTravelLabel(r),a.reason,JSON.stringify(r.raw||{})].join(' ').toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  });
};

B.groupRows=rows=>{
  const by=new Map();for(const r of rows){const k=B.duplicateKey(r);if(!by.has(k))by.set(k,[]);by.get(k).push(r)}
  const gs=[...by.entries()].map(([key,items])=>({key,rows:items.sort((a,b)=>B.timeInterval(a.time)[0]-B.timeInterval(b.time)[0]||String(a.id).localeCompare(String(b.id)))}));
  gs.sort((a,b)=>B.timeInterval(a.rows[0]?.time)[0]-B.timeInterval(b.rows[0]?.time)[0]||a.key.localeCompare(b.key));
  return gs;
};
B.dupBadge=r=>r.duplicateStatus==='confirmed-drop'?'<span class="dup-badge drop">确认重复</span>':r.duplicateStatus==='confirmed-keep'?'<span class="dup-badge keep">确认重复</span>':r.duplicateStatus==='suspected'?'<span class="dup-badge suspect">疑似重复</span>':r.duplicateGroup?'<span class="dup-badge suspect">重复组</span>':'<span class="dup-badge">独立</span>';

B.renderLedger=()=>{
  B.refreshInclusion();
  const rows=B.filtered(),groups=B.groupRows(rows),pages=[];let cur=[],count=0;
  for(const g of groups){
    const n=g.rows.length;
    if(cur.length&&count+n>B.PAGE_SIZE){pages.push(cur);cur=[];count=0}
    cur.push(g);count+=n;
  }
  if(cur.length||!pages.length)pages.push(cur);
  B.$('filteredCount').textContent=`${rows.length} 条 · ${groups.filter(g=>g.rows.length>1).length} 个重复/疑似组`;
  B.state.page=Math.min(Math.max(B.state.page,1),pages.length);
  const part=pages[B.state.page-1]||[],html=[];
  for(const g of part){
    const isGroup=g.rows.length>1||g.rows.some(r=>r.duplicateGroup||r.duplicateStatus==='suspected'||r.duplicateStatus?.startsWith('confirmed'));
    if(isGroup){
      const inc=g.rows.filter(B.isIncluded).length,sus=g.rows.some(r=>r.duplicateStatus==='suspected');
      html.push(`<tr class="dup-group-row"><td colspan="10"><span class="group-dot ${sus?'sus':''}"></span><b>${sus?'疑似重复组':'重复组'} ${B.esc(g.key.replace(/^G:/,''))}</b><span>${g.rows.length} 条记录 · 当前 ${inc} 条计入统计 · 相关记录已强制相邻显示</span></td></tr>`);
    }
    for(const r of g.rows){
      const a=B.autoTravel(r),inc=B.isIncluded(r),manual=B.manualSelection(r),final=B.finalTravelLabel(r);
      html.push(`<tr class="${inc?'':'row-drop'}">
        <td><div class="time-main">${B.esc(r.time||'—')}</div><div class="time-precision">${B.esc(B.timePrecision(r.time))}</div></td>
        <td>${B.sourceBadge(r)}</td>
        <td>${B.esc(r.direction)}</td>
        <td class="num ${r.direction==='收入'?'money-in':r.direction==='支出'?'money-out':''}">${B.money(r.amount)}</td>
        <td><div class="merchant">${B.esc(r.counterparty||r.category||'—')}</div><div class="subline" title="${B.esc(r.description||'')}">${B.esc(r.description||r.category||'')}</div></td>
        <td><div class="auto-class">${B.esc(B.autoTravelLabel(r))}<span class="confidence c-${a.confidence}">${B.esc(a.confidence)}</span></div><div class="auto-reason" title="${B.esc(a.reason)}">${B.esc(a.reason)}</div></td>
        <td><select class="class-select ${B.esc(manual)}" data-class-id="${B.esc(r.id)}">${B.classOptions(r)}</select><div class="final-result">最终：${B.esc(final)}</div></td>
        <td><label class="include-switch"><input type="checkbox" data-include-id="${B.esc(r.id)}" ${inc?'checked':''}><span>${inc?'计入':'不计入'}</span></label></td>
        <td>${B.dupBadge(r)}${r.duplicateGroup?`<div class="dup-id">${B.esc(r.duplicateGroup)}</div>`:''}</td>
        <td><button class="details-btn" data-detail-id="${B.esc(r.id)}">完整信息</button></td>
      </tr>`);
    }
  }
  B.$('ledgerBody').innerHTML=html.join('');
  B.$('pageInfo').textContent=`${B.state.page} / ${pages.length}`;
  B.$('prevPage').disabled=B.state.page<=1;B.$('nextPage').disabled=B.state.page>=pages.length;
};

B.updateManual=async(id,v)=>{
  const r=B.state.records.find(x=>x.id===id);if(!r)return;
  r.manualOverride=v;r.manualClass=NEW_TO_LEGACY(v==='auto'?B.autoTravel(r).code:v);
  await B.put('records',r);B.renderAll();
};
B.updateInclude=async(id,checked)=>{
  const r=B.state.records.find(x=>x.id===id);if(!r)return;
  const key=B.duplicateKey(r),all=B.dupContext().groups.get(key)||[r];
  r.includeOverride=!!checked;
  const changed=[r];
  if(all.length===2){
    const other=all.find(x=>x.id!==id);
    if(other){other.includeOverride=!checked;changed.push(other)}
  }
  await B.putMany('records',changed);
  B.invalidateInclusion();B.recomputeRefunds();B.renderAll();
};

const sumClass=(rows,selector)=>rows.filter(r=>selector(r)).reduce((s,r)=>s+B.impact(r),0);
B.metrics=()=>{
  B.refreshInclusion();
  const rows=B.state.records.filter(B.isIncluded),exp=rows.reduce((s,r)=>s+B.expense(r),0),inc=rows.reduce((s,r)=>s+B.income(r),0);
  const autoPrep=sumClass(rows,r=>B.autoTravel(r).code==='prep'),autoDT=sumClass(rows,r=>B.autoTravel(r).code==='during_travel'),autoDN=sumClass(rows,r=>B.autoTravel(r).code==='during_nontravel');
  const prep=sumClass(rows,r=>B.finalTravelClass(r)==='prep'),dt=sumClass(rows,r=>B.finalTravelClass(r)==='during_travel'),dn=sumClass(rows,r=>B.finalTravelClass(r)==='during_nontravel');
  B.$('mExpense').textContent=B.money(exp);B.$('mIncome').textContent=B.money(inc);B.$('mNet').textContent=B.money(exp-inc);
  B.$('mExpenseCount').textContent=`${rows.filter(r=>r.direction==='支出'||B.state.refundOffsetIds.has(r.id)).length} 笔`;
  B.$('mIncomeCount').textContent=`${rows.filter(r=>r.direction==='收入').length} 笔`;
  B.$('mTravel').textContent=B.money(prep+dt);B.$('mPeriod').textContent=B.money(dt+dn);
  if(B.$('mTravelTotal'))B.$('mTravelTotal').textContent=B.money(prep+dt+dn);
  const review=rows.filter(r=>B.autoTravel(r).confidence==='低'&&B.manualSelection(r)==='auto'&&B.impact(r)!==0).length;
  B.$('mUnknown').textContent=review;
  if(B.$('aPrep'))B.$('aPrep').textContent=B.money(autoPrep);
  if(B.$('aDuringTravel'))B.$('aDuringTravel').textContent=B.money(autoDT);
  if(B.$('aDuringNonTravel'))B.$('aDuringNonTravel').textContent=B.money(autoDN);
  if(B.$('aTravelTotal'))B.$('aTravelTotal').textContent=B.money(autoPrep+autoDT+autoDN);
  if(B.$('aPureTravel'))B.$('aPureTravel').textContent=B.money(autoPrep+autoDT);
};

B.renderTimeStats=()=>{
  if(!B.$('statCards'))return;
  B.refreshInclusion();
  const from=B.$('statFrom').value,to=B.$('statTo').value,raw=B.state.records.filter(r=>B.inTimeRange(r,from,to)),rows=raw.filter(B.isIncluded);
  const exp=rows.reduce((s,r)=>s+B.expense(r),0),inc=rows.reduce((s,r)=>s+B.income(r),0);
  const prep=sumClass(rows,r=>B.finalTravelClass(r)==='prep'),dt=sumClass(rows,r=>B.finalTravelClass(r)==='during_travel'),dn=sumClass(rows,r=>B.finalTravelClass(r)==='during_nontravel');
  const cards=[
    ['计入记录',`${rows.length} 条`,`${raw.length-rows.length} 条重复/手动排除`],
    ['支出净额',B.money(exp),'退款/冲正按现有规则抵扣'],
    ['收入',B.money(inc),'所选时间段'],
    [exp-inc>=0?'净支出':'净收入',B.money(Math.abs(exp-inc)),exp-inc>=0?'支出 − 收入':'收入 − 支出'],
    ['纯旅游支出',B.money(prep+dt),'准备 + 期间旅游'],
    ['旅游总支出',B.money(prep+dt+dn),'准备 + 期间旅游 + 期间非旅游']
  ];
  B.$('statCards').innerHTML=cards.map(([k,v,n])=>`<article><span>${B.esc(k)}</span><strong>${B.esc(v)}</strong><small>${B.esc(n)}</small></article>`).join('');
  const by=new Map();
  for(const r of rows){
    const k=r.source||'其他';if(!by.has(k))by.set(k,{source:k,count:0,expense:0,income:0});
    const x=by.get(k);x.count++;x.expense+=B.expense(r);x.income+=B.income(r);
  }
  B.$('statSourceBody').innerHTML=[...by.values()].sort((a,b)=>a.source.localeCompare(b.source,'zh-CN')).map(x=>`<tr><td>${B.esc(x.source)}</td><td>${x.count}</td><td class="num">${B.money(x.expense)}</td><td class="num">${B.money(x.income)}</td><td class="num">${B.money(x.expense-x.income)}</td></tr>`).join('')||'<tr><td colspan="5">当前时间范围没有记录</td></tr>';
  B.$('statRangeNote').textContent=from||to?`统计范围：${from||'最早'} ～ ${to||'最新'}。源文件若只提供日期/分钟，本系统不会伪造更高时间精度，而是按该日期/分钟的完整可能区间判断是否落入筛选范围。`:'当前统计全部时间。源文件缺失的时分秒不会被自动补造成“精确时间”。';
};

B.showDetail=id=>{
  const r=B.state.records.find(x=>x.id===id);if(!r)return;const a=B.autoTravel(r);
  B.$('detailTitle').textContent=`${r.source} · ${r.counterparty||r.category||r.id}`;
  B.$('detailSub').textContent=`${r.time} · ${B.money(r.amount)} · ${r.direction}`;
  const n={
    'ID':r.id,'时间（保持源文件最高精度）':r.time,'时间精度':B.timePrecision(r.time),'来源':r.source,'原始收支':r.direction,'金额':r.amount,
    '类别/摘要':r.category,'交易对方':r.counterparty,'商品/附言/说明':r.description,'支付方式':r.paymentMethod,'状态':r.status,'经济分类':r.economicClass,
    '自动识别结果':B.autoTravelLabel(r),'自动识别置信度':a.confidence,'自动识别依据':a.reason,'手动修正选择':B.manualSelection(r)==='auto'?'跟随自动识别':LABELS[B.manualSelection(r)],
    '手动修正后的最终结果':B.finalTravelLabel(r),'是否计入统计':B.isIncluded(r)?'计入':'不计入',
    '旧版人工分类':r.manualClass,'旧版系统旅游判断':r.travelSeed,'旧版旅游判断依据':r.travelReason,
    '重复状态':r.duplicateStatus,'重复组':r.duplicateGroup||B.duplicateKey(r).replace(/^G:|^V:/,''),'重复说明':r.duplicateNote,'导入批次':r.importBatch
  };
  B.$('detailContent').innerHTML=`<div class="detail-warning">自动识别仅供参考，可能不准确；最终统计以“手动修正后的最终结果”和“是否计入统计”为准。</div><dl class="detail-grid">${Object.entries(n).map(([k,v])=>`<dt>${B.esc(k)}</dt><dd>${B.esc(v??'')}</dd>`).join('')}</dl><h4>全部原始字段</h4><div class="raw-box">${B.esc(JSON.stringify(r.raw||{},null,2))}</div>`;
  B.$('detailDialog').showModal();
};

B.renderAll=()=>{
  B.metrics();B.renderLedger();B.renderBatches();B.renderExportPreview?.();B.renderTimeStats();
  B.$('navCount').textContent=B.state.records.length;B.$('batchCount').textContent=B.state.batches.length;
};
const baseLoad=B.load;
B.load=async()=>{
  await baseLoad();
  B.state.settings.travelEnd=B.state.settings.travelEnd||'2026-08-14';
  if(B.$('travelEnd'))B.$('travelEnd').value=B.state.settings.travelEnd;
  B.invalidateInclusion();B.recomputeRefunds();B.renderAll();
};
})();