(()=>{'use strict';
const B=window.BO;if(!B)return;
const enhanceCard=()=>{
  const card=B.$('activeSwipeCard');if(!card)return;
  const detail=card.querySelector('.swipe-detail-scroll');
  const manual=card.querySelector('.swipe-manual-box');
  const drag=card.querySelector('.swipe-drag-zone');
  if(detail&&detail.dataset.completeUi!=='1'){
    detail.dataset.completeUi='1';
    detail.removeAttribute('aria-hidden');
    detail.setAttribute('aria-label','本条流水完整明细，可上下滚动');
    detail.addEventListener('pointerdown',e=>e.stopPropagation());
    detail.addEventListener('click',e=>e.stopPropagation());
  }
  if(manual&&manual.dataset.completeUi!=='1'){
    manual.dataset.completeUi='1';
    manual.addEventListener('pointerdown',e=>e.stopPropagation());
  }
  if(drag){
    drag.setAttribute('aria-label','按住此区域向八个方向拖动归类');
    const hint=drag.querySelector('.swipe-drag-hint');
    if(hint)hint.textContent='按住金额 / 商户区域拖动归类；下方完整明细区域可独立上下滚动';
  }
  const detailBtn=card.querySelector('.swipe-open-detail');
  if(detailBtn)detailBtn.textContent='放大查看';
};
if(typeof B.renderSwipeReview==='function'){
  const base=B.renderSwipeReview;
  B.renderSwipeReview=function(...args){const out=base.apply(this,args);enhanceCard();return out};
}
const oldRenderAll=B.renderAll;
if(typeof oldRenderAll==='function')B.renderAll=function(...args){const out=oldRenderAll.apply(this,args);enhanceCard();return out};
queueMicrotask(enhanceCard);
})();
