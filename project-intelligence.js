(()=>{'use strict';
const B=window.BO;if(!B)return;
const baseAutoCategory=B.autoCategory;
const baseRenderAll=B.renderAll;

const splitWords=v=>String(v||'').split(/[，,、;；\n]+/).map(x=>B.norm(x)).filter(Boolean);
const textOf=x=>B.norm([x.category,x.counterparty,x.description,x.paymentMethod,x.status,x.economicClass,JSON.stringify(x.raw||{})].join(' ')).toLowerCase();
const genericPayee=/^(支付宝|微信支付|财付通|网银在线|美团支付|美团平台商户|上海拉扎斯信息科技有限公司|北京三快在线科技有限公司|京东支付|银联|其他)$/i;
const merchantKey=x=>{
  let s=B.norm(x.counterparty||'');
  if(!s||genericPayee.test(s))s=B.norm(x.description||x.category||'');
  return s.toLowerCase().replace(/美团app|支付宝[-：:]?消费|微信支付[-：:]?|京东支付[-：:]?/g,' ').replace(/[0-9*#_\/|]+/g,' ').replace(/[（）()【】\[\]]/g,' ').replace(/\s+/g,' ').trim().slice(0,48);
};
const isRefundLike=x=>B.isRefund?.(x)||/退款|退票|退货|冲正|撤销|返还|退回|退款成功|已退款/.test(textOf(x));
const phaseOf=(x,cfg)=>{const d=B.dateOnly(x.time);if(!d)return'unknown';if(d<cfg.start)return'prep';if(d<=cfg.end)return'during';return'after'};
const daysBefore=(x,cfg)=>{const d=B.dateOnly(x.time);if(!d)return Infinity;const a=B.timeInterval?.(d)?.[0],b=B.timeInterval?.(cfg.start)?.[0];return Number.isFinite(a)&&Number.isFinite(b)?Math.round((b-a)/86400000):Infinity};
const categoryOf=x=>B.finalCategory?.(x)||baseAutoCategory?.(x)||{id:'uncategorized',majorId:'other',major:'其他',name:'未分类',kind:'expense'};

const DIRECT_TRAVEL=/12306|铁路|高铁|动车|火车票|列车|车次|机票|航空|航班|机场|酒店|宾馆|民宿|旅馆|住宿|青旅|旅行社|旅游团|自由行|景区|门票|博物馆|海洋馆|动物园|游乐园|轮渡|船票|游船|租车|旅行保险|旅游保险|签证|去哪儿|携程|飞猪|同程/;
const TRIP_CONSUMPTION=/餐饮|餐厅|饭店|小吃|烧烤|海鲜|咖啡|茶饮|奶茶|外卖|超市|便利店|商店|商场|团购|滴滴|网约车|出租车|快车|公交|地铁|轨道交通|打车/;
const TRAVEL_GEAR=/一次性|隔脏|床单|床笠|被罩|被套|枕套|浴巾|毛巾|马桶垫|拖鞋|洗漱|旅行装|收纳|行李|旅行箱|拉杆箱|防晒|遮阳|雨衣|泳衣|泳裤|充电宝|转换插头/;
const TRIP_WEAR=/服装|服饰|衣服|上衣|T恤|衬衫|裙|裤|鞋|袜|帽|泳衣|泳裤|饰品|项链|耳环|耳饰|手链|发饰|墨镜|太阳镜|香水|美妆|护肤/;
const GIFT_INTENT=/七夕|生日|纪念日|情人节|礼物|礼品|赠礼|送给|赠送|情侣礼物|求婚|鲜花|花束|花篮|新娘花|红包|礼金/;
const GOLD_GIFT=/黄金|足金|金饰|金项链|金戒指|金手链|金吊坠|对戒|老庙|老凤祥|周大福|周生生|六福|中国黄金/;
const FINANCIAL=/还款|信贷|贷款|借款|花呗|信用卡|理财|基金|证券|股票|ETF|余额宝|零钱通|小荷包|转入|转出|提现|充值到余额|内部资金|资产调拨/;
const RECURRING_NON_TRAVEL=/话费|手机充值|宽带|电费|水费|燃气|房租|物业|会员|订阅|网盘|云服务|学费|课程|培训|考试|宠物|保险/;
const HARD_NONTRAVEL_MAJORS=new Set(['finance','housing','communication','education','pet','vehicle','digital_service','social']);
const DURING_POSITIVE_MAJORS=new Set(['food','transport','travel','shopping','personal']);
const PREP_POSITIVE_IDS=new Set(['travel_gear','clothing','beauty','daily_goods','jewelry','grocery','personal_other','hair_beauty']);

const config=()=>{
  const s=B.state?.settings||{};
  const prepDays=Math.max(1,Math.min(90,Number(s.travelPrepDays)||45));
  const broadDays=Math.max(1,Math.min(prepDays,Number(s.travelBroadPrepDays)||21));
  return{
    start:s.travelStart||'2026-08-08',end:s.travelEnd||'9999-12-31',prepDays,broadDays,
    locations:splitWords(s.travelLocationKeywords),includes:splitWords(s.travelIncludeKeywords),excludes:splitWords(s.travelExcludeKeywords),
    learn:s.travelLearnManual!==false,broadDuring:s.travelBroadDuring!==false
  };
};

const buildContext=()=>{
  const cfg=config(),records=B.state?.records||[],manual=new Map(),outside=new Map();
  for(const x of records){
    const k=merchantKey(x);if(!k||k.length<2)continue;
    const sel=B.manualSelection?.(x)||'auto';
    if(sel!=='auto'){
      if(!manual.has(k))manual.set(k,{travel:0,non:0,codes:new Map()});
      const m=manual.get(k),yes=sel==='prep'||sel==='during_travel';yes?m.travel++:m.non++;m.codes.set(sel,(m.codes.get(sel)||0)+1);
    }
    const ph=phaseOf(x,cfg);if(ph==='prep'&&daysBefore(x,cfg)<=cfg.prepDays||ph==='during')continue;
    outside.set(k,(outside.get(k)||0)+1);
  }
  return{cfg,records,manual,outside,refund:new Map()};
};
const ctx=()=>B._projectIntelCtx||(B._projectIntelCtx=buildContext());
B.invalidateProjectIntelligence=()=>{B._projectIntelCtx=null};

const findRefundParent=x=>{
  const c=ctx();if(c.refund.has(x.id))return c.refund.get(x.id)||null;
  if(!isRefundLike(x)){c.refund.set(x.id,null);return null}
  const k=merchantKey(x),t=B.timeInterval?.(x.time)?.[0]??Infinity;
  let best=null,bestScore=-Infinity;
  for(const p of c.records){
    if(p.id===x.id||p.direction!=='支出'||Math.abs((p.amount||0)-(x.amount||0))>.011)continue;
    const pt=B.timeInterval?.(p.time)?.[0]??-Infinity;if(pt>t)continue;
    let score=0;if(p.source===x.source)score+=2;if(k&&merchantKey(p)===k)score+=5;
    if(B.dateOnly(p.time)===B.dateOnly(x.time))score+=2;const days=(t-pt)/86400000;if(days<=30)score+=2;else if(days<=120)score+=1;
    if(score>bestScore){bestScore=score;best=p}
  }
  if(bestScore<4)best=null;c.refund.set(x.id,best);return best;
};

const learnedCategory=x=>{
  const k=merchantKey(x);if(!k)return null;const counts=new Map();
  for(const p of B.state?.records||[]){if(p.id===x.id||merchantKey(p)!==k)continue;const id=p.categoryOverride;if(!id||id==='auto'||!B.categoryById?.has(id))continue;counts.set(id,(counts.get(id)||0)+1)}
  const ranked=[...counts].sort((a,b)=>b[1]-a[1]);if(!ranked.length)return null;
  if(ranked[1]&&ranked[1][1]===ranked[0][1])return null;const [id,n]=ranked[0],cat=B.categoryById.get(id);
  return{...cat,confidence:n>=2?'高':'中',reason:`沿用你对同一商户“${k}”的${n}次人工分类；人工历史优先于通用关键词`};
};
B.autoCategory=x=>{
  if(isRefundLike(x)){const p=findRefundParent(x);if(p){const c=p.categoryOverride&&p.categoryOverride!=='auto'&&B.categoryById?.has(p.categoryOverride)?B.categoryById.get(p.categoryOverride):baseAutoCategory(p);return{...c,confidence:'高',reason:`退款/退票继承原交易分类：${c.major} › ${c.name}`}}}
  const learned=learnedCategory(x);if(learned)return learned;
  return baseAutoCategory(x);
};

const scoreTravel=(x,skipRefund=false)=>{
  const c=ctx(),cfg=c.cfg,t=textOf(x),cat=categoryOf(x),ph=phaseOf(x,cfg),d=B.dateOnly(x.time),signals=[];let score=0,conflict=false;
  const add=(n,msg)=>{score+=n;signals.push(`${n>0?'+':''}${n} ${msg}`)};
  if(!skipRefund&&isRefundLike(x)){
    const p=findRefundParent(x);if(p){const pc=scoreTravel(p,true);return{...pc,reason:`退款/退票继承原交易项目归属：${pc.reason}`,inheritedFrom:p.id}}
  }
  if(x.direction==='收入')return{code:'other',confidence:'高',score:-10,reason:'非退款收入不计入旅行支出项目；项目收入可单独统计'};
  if(/理财\/资产调拨|内部资金调拨|还款\/债务结算|内部\/中性交易/.test(x.economicClass||'')||FINANCIAL.test(t))return{code:ph==='during'?'during_nontravel':'other',confidence:'高',score:-12,reason:'强排除：还款、理财、内部调拨或债务结算不属于旅行消费'};
  if(!d)return{code:'other',confidence:'低',score:0,reason:'缺少有效日期，无法判断与旅行项目的时间关系'};
  if(ph==='after')return{code:'other',confidence:'高',score:-8,reason:'交易发生在当前旅行结束日期之后；退款除外'};
  const db=daysBefore(x,cfg);
  if(ph==='prep'){
    if(db>cfg.prepDays)return{code:'other',confidence:'高',score:-6,reason:`发生在旅行开始前 ${db} 天，超出设定的 ${cfg.prepDays} 天准备期`};
    add(db<=7?4:db<=cfg.broadDays?3:1,`距离出发 ${db} 天`);
  } else add(5,'发生在旅行期间');

  const userExclude=cfg.excludes.find(k=>t.includes(k.toLowerCase()));
  if(userExclude)return{code:ph==='during'?'during_nontravel':'other',confidence:'高',score:-15,reason:`用户强排除关键词“${userExclude}”命中`};
  const userInclude=cfg.includes.find(k=>t.includes(k.toLowerCase()));if(userInclude)add(8,`用户指定旅行关键词“${userInclude}”`);
  const loc=cfg.locations.find(k=>t.includes(k.toLowerCase()));if(loc)add(5,`命中旅行目的地/地点“${loc}”`);

  const direct=DIRECT_TRAVEL.test(t);if(direct)add(6,'命中交通、住宿、门票或旅行服务等直接证据');
  if(GIFT_INTENT.test(t)){add(-10,'命中礼物/节日/赠礼意图');conflict=true}
  if(GOLD_GIFT.test(t)){add(-7,'黄金/足金珠宝通常属于礼物或资产消费，不默认计入旅行');conflict=true}

  if(ph==='during'&&cfg.broadDuring){
    if(DURING_POSITIVE_MAJORS.has(cat.majorId))add(cat.majorId==='shopping'?4:3,`旅行期间的“${cat.major}”默认视为旅行相关`);
    if(TRIP_CONSUMPTION.test(t))add(3,'命中旅行期间常见即时消费场景');
    if(TRAVEL_GEAR.test(t))add(5,'命中一次性/隔脏/洗漱/收纳等旅行用品');
    if(TRIP_WEAR.test(t))add(4,'旅行期间购买服饰、配饰或个人用品');
  }
  if(ph==='prep'){
    if(cat.id==='travel_gear'||TRAVEL_GEAR.test(t))add(6,'准备期购买明确旅行用品');
    if(db<=cfg.broadDays&&(PREP_POSITIVE_IDS.has(cat.id)||TRIP_WEAR.test(t)))add(4,`出发前 ${cfg.broadDays} 天内购买服饰、配饰或个人用品`);
    else if(TRIP_WEAR.test(t))add(1,'准备期存在服饰/配饰信号，但距离出发较远');
  }

  if(HARD_NONTRAVEL_MAJORS.has(cat.majorId)){add(-5,`${cat.major}通常与旅行项目无关`);conflict=true}
  if(RECURRING_NON_TRAVEL.test(t)){add(-5,'命中固定账单/订阅/教育/宠物等常规非旅行信号');conflict=true}
  const k=merchantKey(x),outside=k?(c.outside.get(k)||0):0;
  if(outside>=3&&HARD_NONTRAVEL_MAJORS.has(cat.majorId))add(-3,`同一商户在旅行外已出现 ${outside} 次，呈现常规消费模式`);

  if(cfg.learn&&k){const m=c.manual.get(k);if(m&&m.travel!==m.non){const delta=m.travel>m.non?Math.min(6,3+m.travel):-Math.min(6,3+m.non);add(delta,`学习同商户历史人工修正：旅行 ${m.travel} 次 / 非旅行 ${m.non} 次`);if(delta<0)conflict=true}}

  let code;if(ph==='during')code=score>=3?'during_travel':'during_nontravel';else code=score>=6?'prep':'other';
  let confidence='低';const abs=Math.abs(score);
  if((score>=9||score<=-8)&&!conflict)confidence='高';else if(abs>=5)confidence='中';
  if(direct&&score>=8&&!GIFT_INTENT.test(t)&&!GOLD_GIFT.test(t))confidence='高';
  if(score<=-8&&(GIFT_INTENT.test(t)||GOLD_GIFT.test(t)||FINANCIAL.test(t)))confidence='高';
  const label=code==='prep'?'旅游前准备支出':code==='during_travel'?'旅游期间旅游支出':code==='during_nontravel'?'旅游期间非旅游支出':'非旅游 / 其他';
  return{code,confidence,score,reason:`${label} · 项目归属评分 ${score}。${signals.slice(0,7).join('；')||'没有足够上下文证据'}${signals.length>7?'；…':''}`,signals};
};
B.classifyProject=(x,profile)=>{if(profile?.type&&profile.type!=='travel')return{code:'other',confidence:'低',score:0,reason:'当前版本已建立项目归属框架，非旅行项目需配置专属规则'};return scoreTravel(x)};
B.autoTravel=x=>scoreTravel(x);

const oldFlat=B.flat;if(typeof oldFlat==='function')B.flat=(x,raw)=>{const o=oldFlat(x,raw),p=B.autoTravel(x);return{...o,自动项目归属评分:p.score??'',自动项目归属证据:Array.isArray(p.signals)?p.signals.join(' | '):'',自动项目归属版本:'Project Intelligence v2'}};

const ensureUI=()=>{
  const settings=B.$('view-settings');if(!settings||B.$('projectIntelCard'))return;
  const grid=settings.querySelector('.settings-grid')||settings;
  const card=document.createElement('article');card.id='projectIntelCard';card.className='panel project-intel-card';
  card.innerHTML=`<h3>项目归属智能识别</h3><p>消费分类回答“买了什么”，项目归属回答“为什么买 / 属于哪个项目”。当前用于旅行统计，并为后续其他项目复用同一评分框架。</p><div class="project-intel-grid"><label>旅行准备期（天）<input id="travelPrepDays" type="number" min="1" max="90"></label><label>重点准备期（天）<input id="travelBroadPrepDays" type="number" min="1" max="60"></label><label class="wide">目的地 / 地点关键词<textarea id="travelLocationKeywords" rows="2" placeholder="可选，例如：城市、区县、商圈、车站；逗号分隔"></textarea></label><label class="wide">额外自动计入关键词<textarea id="travelIncludeKeywords" rows="2" placeholder="例如：某次旅行专门购买的商品、商户或活动"></textarea></label><label class="wide">额外强排除关键词<textarea id="travelExcludeKeywords" rows="2" placeholder="例如：特定礼物、固定账单或与旅行无关的项目"></textarea></label><label class="check"><input id="travelBroadDuring" type="checkbox"> 旅行期间的餐饮、交通、购物、日用品、服饰/配饰等消费默认视为旅行相关，除非命中强排除证据</label><label class="check"><input id="travelLearnManual" type="checkbox"> 从你的人工修正中学习同商户项目归属</label></div><div class="project-intel-note"><b>内置强排除：</b>还款、理财、内部调拨；礼物/节日赠礼；黄金/足金珠宝；固定账单等。普通“项链/饰品”不会单独被排除，出发前重点准备期或旅行期间可计入旅行。</div><button class="btn primary" id="saveProjectIntel">保存智能识别设置并重新计算</button>`;
  grid.insertAdjacentElement('afterbegin',card);
  if(!B.$('projectIntelStyle')){const st=document.createElement('style');st.id='projectIntelStyle';st.textContent='.project-intel-card{grid-column:1/-1}.project-intel-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}.project-intel-grid label{display:grid;gap:5px;font-size:11px;color:#5f6b7e}.project-intel-grid input,.project-intel-grid textarea{width:100%;box-sizing:border-box;border:1px solid #dfe5ef;border-radius:10px;padding:9px;background:#fff;color:#1d2941}.project-intel-grid .wide,.project-intel-grid .check{grid-column:1/-1}.project-intel-grid .check{display:flex;align-items:flex-start;gap:8px;line-height:1.45}.project-intel-grid .check input{width:auto;margin-top:2px}.project-intel-note{padding:9px 11px;border-radius:10px;background:#f6f8fc;border:1px solid #e2e7f0;color:#5d687c;font-size:10px;line-height:1.5;margin-bottom:10px}@media(max-width:700px){.project-intel-grid{grid-template-columns:1fr}.project-intel-grid .wide,.project-intel-grid .check{grid-column:1}}';document.head.appendChild(st)}
};
const fillUI=()=>{ensureUI();const s=B.state?.settings||{};const set=(id,v)=>{const e=B.$(id);if(e)e.value=v??''};set('travelPrepDays',s.travelPrepDays||45);set('travelBroadPrepDays',s.travelBroadPrepDays||21);set('travelLocationKeywords',s.travelLocationKeywords||'');set('travelIncludeKeywords',s.travelIncludeKeywords||'');set('travelExcludeKeywords',s.travelExcludeKeywords||'');if(B.$('travelBroadDuring'))B.$('travelBroadDuring').checked=s.travelBroadDuring!==false;if(B.$('travelLearnManual'))B.$('travelLearnManual').checked=s.travelLearnManual!==false};
const saveUI=async()=>{const s=B.state.settings,vals={travelPrepDays:Math.max(1,Math.min(90,Number(B.$('travelPrepDays')?.value)||45)),travelBroadPrepDays:Math.max(1,Math.min(60,Number(B.$('travelBroadPrepDays')?.value)||21)),travelLocationKeywords:B.norm(B.$('travelLocationKeywords')?.value||''),travelIncludeKeywords:B.norm(B.$('travelIncludeKeywords')?.value||''),travelExcludeKeywords:B.norm(B.$('travelExcludeKeywords')?.value||''),travelBroadDuring:!!B.$('travelBroadDuring')?.checked,travelLearnManual:!!B.$('travelLearnManual')?.checked};Object.assign(s,vals);for(const[k,v]of Object.entries(vals))await B.put('settings',{key:k,value:v});B.invalidateProjectIntelligence();B.renderAll();B.toast?.('项目归属智能识别已重新计算')};
const bindUI=()=>{ensureUI();fillUI();const btn=B.$('saveProjectIntel');if(btn&&!btn.dataset.bound){btn.dataset.bound='1';btn.onclick=saveUI}};

if(typeof baseRenderAll==='function')B.renderAll=function(...args){B.invalidateProjectIntelligence();const out=baseRenderAll.apply(this,args);bindUI();return out};
const oldLoad=B.load;if(typeof oldLoad==='function')B.load=async function(...args){const out=await oldLoad.apply(this,args);B.invalidateProjectIntelligence();bindUI();return out};
queueMicrotask(()=>{bindUI();B.invalidateProjectIntelligence()});
})();
