(()=>{'use strict';
const BUILD='v1.0.2';
const addStyle=src=>{const s=document.createElement('link');s.rel='stylesheet';s.href=src;document.head.appendChild(s)};
addStyle(`./mobile-review.css?app=${BUILD}`);
addStyle(`./immersive-review.css?app=${BUILD}`);
addStyle(`./swipe-v102.css?app=${BUILD}`);
const load=(src,next)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=next;s.onerror=()=>document.body.insertAdjacentHTML('afterbegin',`<div style="background:#fee;color:#900;padding:12px">模块加载失败：${src}</div>`);document.head.appendChild(s)};
load(`./category-engine.js?app=${BUILD}`,()=>load(`./mobile-review.js?app=${BUILD}`,()=>load(`./immersive-review.js?app=${BUILD}`,()=>load(`./compat-fix.js?app=${BUILD}`,()=>load(`./swipe-card-complete.js?app=${BUILD}`,()=>load(`./app-shell.js?app=${BUILD}`))))));
})();
