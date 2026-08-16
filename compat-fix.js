(()=>{'use strict';
const VERSION='v1.0.0';
window.BO_VERSION=VERSION;
const B=window.BO;
const ensure=(id,tag='div')=>{let el=document.getElementById(id);if(!el){el=document.createElement(tag);el.id=id;el.hidden=true;el.setAttribute('aria-hidden','true');(document.getElementById('view-swipeReview')||document.body).appendChild(el)}return el};
// Compatibility sinks required by the legacy swipe renderer. The immersive layer may hide them, but must not remove them.
ensure('swipeNavCount','span');
ensure('swipeCompass','div');
const versionBadge=()=>{
  if(document.getElementById('appVersionBadge'))return;
  const brand=document.querySelector('.brand');
  if(brand){const badge=document.createElement('span');badge.id='appVersionBadge';badge.className='app-version-badge';badge.textContent=VERSION;badge.title='Bills Organization 当前版本';brand.appendChild(badge)}
  const settings=document.querySelector('#view-settings');
  if(settings&&!document.getElementById('versionInfoCard')){const card=document.createElement('article');card.id='versionInfoCard';card.className='panel version-info-card';card.innerHTML=`<h3>版本信息</h3><p><b>Bills Organization ${VERSION}</b></p><p class="hint">后续每次功能升级或重要修复都会同步更新版本号，便于确认手机是否加载到最新版。</p>`;const grid=settings.querySelector('.settings-grid');grid?grid.appendChild(card):settings.appendChild(card)}
};
versionBadge();
const style=document.createElement('style');style.id='versionBadgeStyle';style.textContent='.app-version-badge{display:inline-flex;align-items:center;justify-content:center;margin-left:8px;padding:2px 7px;border-radius:999px;background:#eef3ff;color:#315efb;border:1px solid #d9e3ff;font-size:10px;font-weight:800;line-height:1.5;white-space:nowrap}.version-info-card p{margin:6px 0}@media(max-width:800px){.app-version-badge{font-size:9px;padding:1px 6px;margin-left:4px}}';document.head.appendChild(style);
})();
