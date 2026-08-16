(()=>{'use strict';
const VERSION='v1.0.2';
window.BO_VERSION=VERSION;
document.documentElement.dataset.appVersion=VERSION;
document.title=`Bills Organization ${VERSION} · 账单整理`;
const B=window.BO;if(!B)return;
const host=()=>document.getElementById('view-swipeReview')||document.body;
const ensure=(id,tag='div',setup)=>{let el=document.getElementById(id);if(!el){el=document.createElement(tag);el.id=id;el.hidden=true;el.setAttribute('aria-hidden','true');setup?.(el);host().appendChild(el)}return el};
const ensureSwipeRuntime=()=>{
  ensure('swipeNavCount','span');
  ensure('swipeCompass','div');
  ensure('swipeStage','div');
  ensure('swipeProgressText','b');
  ensure('swipeProgressSub','span');
  ensure('swipeProgressBar','span');
  ensure('swipeIncludedOnly','input',el=>{el.type='checkbox';el.checked=true});
  ensure('swipeScope','select',el=>{el.innerHTML='<option value="pending">只看待处理</option><option value="all">查看全部</option>'});
  ensure('swipeSort','select',el=>{el.innerHTML='<option value="asc">时间从早到晚</option><option value="desc">时间从晚到早</option>'});
};
ensureSwipeRuntime();
if(typeof B.renderSwipeReview==='function'&&!B.renderSwipeReview.__compat102){
  const base=B.renderSwipeReview;
  const wrapped=function(...args){ensureSwipeRuntime();return base.apply(this,args)};
  wrapped.__compat102=true;
  B.renderSwipeReview=wrapped;
}
const versionBadge=()=>{
  let badge=document.getElementById('appVersionBadge');
  const brand=document.querySelector('.brand');
  if(!badge&&brand){badge=document.createElement('span');badge.id='appVersionBadge';badge.className='app-version-badge';brand.appendChild(badge)}
  if(badge){badge.textContent=VERSION;badge.title='Bills Organization 当前版本'}
  const settings=document.querySelector('#view-settings');
  if(settings){let card=document.getElementById('versionInfoCard');if(!card){card=document.createElement('article');card.id='versionInfoCard';card.className='panel version-info-card';const grid=settings.querySelector('.settings-grid');grid?grid.appendChild(card):settings.appendChild(card)}card.innerHTML=`<h3>版本信息</h3><p><b>Bills Organization ${VERSION}</b></p><p class="hint">重要功能升级与故障修复均更新版本号；反馈问题时请同时提供这里显示的版本。</p>`}
};
versionBadge();
if(!document.getElementById('versionBadgeStyle')){const style=document.createElement('style');style.id='versionBadgeStyle';style.textContent='.app-version-badge{display:inline-flex;align-items:center;justify-content:center;margin-left:8px;padding:2px 7px;border-radius:999px;background:#eef3ff;color:#315efb;border:1px solid #d9e3ff;font-size:10px;font-weight:800;line-height:1.5;white-space:nowrap}.version-info-card p{margin:6px 0}@media(max-width:800px){.app-version-badge{font-size:9px;padding:1px 6px;margin-left:4px}}';document.head.appendChild(style)}
})();
