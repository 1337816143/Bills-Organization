(()=>{'use strict';
const B=window.BO;if(!B)return;
const baseRender=B.renderSwipeReview;
const kindOf=x=>x.direction==='收入'?'income':(x.direction==='支出'||B.state?.refundOffsetIds?.has(x.id)||B.isRefund?.(x))?'expense':'other';
const cardRecord=()=>{const id=B.$('activeSwipeCard')?.dataset.recordId;return (B.state?.records||[]).find(x=>x.id===id)||null};
const inSwipeRange=x=>{const d=B.dateOnly?.(x.time)||String(x.time||'').slice(0,10),f=B.swipeState?.dateFrom||'',t=B.swipeState?.dateTo||'';return(!f||d>=f)&&(!t||d<=t)};
const filteredRecords=()=>{const all=B.state?.records||[];return all.filter(inSwipeRange)};
const normalizeRange=()=>{
  B.swipeState=B.swipeState||{};
  if(B.swipeState.dateFrom==null)B.swipeState.dateFrom=B.state?.settings?.swipeDateFrom||'';
  if(B.swipeState.dateTo==null)B.swipeState.dateTo=B.state?.settings?.swipeDateTo||'';
  if(B.swipeState.dateFrom&&B.swipeState.dateTo&&B.swipeState.dateFrom>B.swipeState.dateTo)B.swipeState.dateTo=B.swipeState.dateFrom;
};
const ensureDateUI=()=>{
  const sec=B.$('view-swipeReview');if(!sec)return;
  normalizeRange();
  let box=B.$('swipeDateFilter');
  if(!box){
    box=document.createElement('div');box.id='swipeDateFilter';box.className='swipe-date-filter';
    box.innerHTML='<span class="swipe-date-title">时间范围</span><label><span>从</span><input type="date" id="swipeDateFrom"></label><span class="swipe-date-sep">—</span><label><span>至</span><input type="date" id="swipeDateTo"></label><button type="button" id="swipeDateAll">全部</button><small id="swipeDateCount"></small>';
    const toolbar=sec.querySelector('.swipe-toolbar');toolbar?.insertAdjacentElement('afterend',box);
    const save=async changed=>{
      let f=B.$('swipeDateFrom')?.value||'',t=B.$('swipeDateTo')?.value||'';
      if(f&&t&&f>t){if(changed==='from'){t=f;B.$('swipeDateTo').value=t}else{f=t;B.$('swipeDateFrom').value=f}B.toast?.('结束日期不能早于开始日期，已自动调整')}
      B.swipeState.dateFrom=f;B.swipeState.dateTo=t;B.swipeState.cursor=0;
      if(B.state?.settings){B.state.settings.swipeDateFrom=f;B.state.settings.swipeDateTo=t}
      if(B.put){await B.put('settings',{key:'swipeDateFrom',value:f});await B.put('settings',{key:'swipeDateTo',value:t})}
      B.renderSwipeReview?.();
    };
    B.$('swipeDateFrom').onchange=()=>save('from');
    B.$('swipeDateTo').onchange=()=>save('to');
    B.$('swipeDateAll').onclick=async()=>{B.$('swipeDateFrom').value='';B.$('swipeDateTo').value='';B.swipeState.dateFrom='';B.swipeState.dateTo='';B.swipeState.cursor=0;if(B.state?.settings){B.state.settings.swipeDateFrom='';B.state.settings.swipeDateTo=''}if(B.put){await B.put('settings',{key:'swipeDateFrom',value:''});await B.put('settings',{key:'swipeDateTo',value:''})}B.renderSwipeReview?.()};
  }
  const f=B.$('swipeDateFrom'),t=B.$('swipeDateTo');if(f)f.value=B.swipeState.dateFrom||'';if(t)t.value=B.swipeState.dateTo||'';
};
const updateDateCount=()=>{const el=B.$('swipeDateCount');if(!el)return;const rows=filteredRecords().filter(x=>kindOf(x)===(B.swipeState?.kind||'expense'));const pending=rows.filter(x=>!x.swipeReviewedAt).length;el.textContent=`范围内 ${rows.length} 条 · 待处理 ${pending} 条`};
const pushHistory=x=>{B.swipeState.history=B.swipeState.history||[];B.swipeState.history.push({id:x.id,categoryOverride:x.categoryOverride,swipeReviewedAt:x.swipeReviewedAt,swipeReviewMethod:x.swipeReviewMethod,swipeReviewDirection:x.swipeReviewDirection,swipeDeferredAt:x.swipeDeferredAt});if(B.swipeState.history.length>30)B.swipeState.history.shift()};
const saveCurrent=async(id,method)=>{const x=cardRecord();if(!x||B.swipeState.busy)return;if(id!=='auto'&&!B.categoryById?.get(id))return B.toast?.('请选择有效分类');B.swipeState.busy=true;pushHistory(x);x.categoryOverride=id;x.swipeReviewedAt=B.nowISO();x.swipeReviewMethod=method;x.swipeReviewDirection='';x.swipeDeferredAt='';try{await B.put('records',x);if(B.swipeState.scope==='all')B.swipeState.cursor=Math.max(0,(B.swipeState.cursor||0)+1)}finally{B.swipeState.busy=false}B.renderAll?.();navigator.vibrate?.(8)};
const deferCurrent=async()=>{const x=cardRecord();if(!x)return;x.swipeDeferredAt=B.nowISO();await B.put('records',x);if(B.swipeState.scope==='all')B.swipeState.cursor=Math.max(0,(B.swipeState.cursor||0)+1);B.renderSwipeReview?.();B.toast?.('已移到当前时间范围队列后面')};
const wireCurrentActions=()=>{
  const accept=B.$('swipeAcceptAuto');if(accept)accept.onclick=()=>saveCurrent('auto','accept-auto');
  const defer=B.$('swipeDefer');if(defer)defer.onclick=deferCurrent;
  const stage=B.$('swipeStage');if(stage)stage.onclick=e=>{if(e.target.id==='swipeSaveManual'){const id=B.$('swipeManualCategory')?.value;if(id)saveCurrent(id,'manual')}};
};
B.renderSwipeReview=function(...args){
  ensureDateUI();normalizeRange();
  const original=B.state.records,subset=filteredRecords();
  B.state.records=subset;
  try{return baseRender?.apply(this,args)}finally{B.state.records=original;updateDateCount();wireCurrentActions()}
};
const oldRenderAll=B.renderAll;if(typeof oldRenderAll==='function')B.renderAll=function(...args){const out=oldRenderAll.apply(this,args);ensureDateUI();updateDateCount();wireCurrentActions();return out};
queueMicrotask(()=>{ensureDateUI();B.renderSwipeReview?.()});
})();