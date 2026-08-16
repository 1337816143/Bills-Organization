(()=>{'use strict';
const addStyle=src=>{const s=document.createElement('link');s.rel='stylesheet';s.href=src;document.head.appendChild(s)};
addStyle('./mobile-review.css?v=20260816');
addStyle('./immersive-review.css?v=20260816d');
const load=(src,next)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=next;s.onerror=()=>document.body.insertAdjacentHTML('afterbegin',`<div style="background:#fee;color:#900;padding:12px">模块加载失败：${src}</div>`);document.head.appendChild(s)};
load('./category-engine.js?v=20260816',()=>load('./mobile-review.js?v=20260816',()=>load('./immersive-review.js?v=20260816d',()=>load('./app-shell.js?v=20260816'))));
})();