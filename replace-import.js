(()=>{'use strict';
const B=window.BO;if(!B)return;
let mode='incremental';
const input=B.$('fileInput'),dialog=B.$('importDialog'),progress=B.$('importProgress'),choose=B.$('chooseFiles');
if(!input||!dialog||!progress)return;
const normalHandler=input.onchange;
const esc=s=>B.esc?.(s)??String(s??'');
const ensureUI=()=>{
  if(B.$('replaceAllFiles'))return;
  const drop=B.$('dropzone');if(!drop)return;
  const box=document.createElement('div');box.className='replace-import-box';box.innerHTML=`<div class="replace-import-copy"><b>替换全部流水</b><span>用于整批换账单：先在本机解析全部文件，全部成功后才清空旧流水并一次性写入新流水。分类体系、旅游日期、自定义手势等设置保留。</span></div><button type="button" class="btn danger" id="replaceAllFiles">选择文件并替换</button>`;
  drop.insertAdjacentElement('afterend',box);
  if(!B.$('replaceImportStyle')){const s=document.createElement('style');s.id='replaceImportStyle';s.textContent='.replace-import-box{margin:12px 0 0;padding:12px 14px;border:1px solid #f0c8c4;background:#fff8f7;border-radius:14px;display:flex;gap:12px;align-items:center;justify-content:space-between}.replace-import-copy{min-width:0}.replace-import-copy b,.replace-import-copy span{display:block}.replace-import-copy b{color:#9f2f28;margin-bottom:3px}.replace-import-copy span{font-size:11px;line-height:1.45;color:#7a6260}.replace-import-box .btn{flex:0 0 auto}@media(max-width:600px){.replace-import-box{display:grid}.replace-import-box .btn{width:100%;min-height:44px}}.replace-preflight{display:grid;gap:7px;margin-top:10px}.replace-preflight>div{padding:8px 10px;border-radius:10px;background:#f7f9fd;border:1px solid #e4e9f2;font-size:11px}.replace-preflight b{display:block;color:#26334b}.replace-ok{color:#087a52}.replace-error{color:#b42318}';document.head.appendChild(s)}
  B.$('replaceAllFiles').onclick=()=>{mode='replace';input.multiple=true;input.accept='.csv,.txt,.xls,.xlsx,.pdf,.json,.html';input.click()};
};
const setProgress=(html)=>{progress.innerHTML=html};
const appendProgress=(html)=>{progress.insertAdjacentHTML('beforeend',html)};
const atomicReplace=(records,batches)=>new Promise((resolve,reject)=>{
  const tx=B.state.db.transaction(['records','batches'],'readwrite'),rs=tx.objectStore('records'),bs=tx.objectStore('batches');
  rs.clear();bs.clear();records.forEach(r=>rs.put(r));batches.forEach(b=>bs.put(b));
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('本地数据库写入失败'));tx.onabort=()=>reject(tx.error||new Error('替换事务已中止'));
});
const parseAll=async files=>{
  const parsed=[];setProgress('<div class="replace-preflight"><div><b>替换前检查</b>正在本机解析所选账单；此阶段不会删除任何旧流水。</div></div>');
  for(let i=0;i<files.length;i++){
    const f=files[i];appendProgress(`<div id="replace-step-${i}"><b>${i+1}/${files.length} · ${esc(f.name)}</b><span>解析中…</span></div>`);
    const step=B.$(`replace-step-${i}`);
    try{
      const out=await B.parseFile(f);if(!out?.records?.length)throw new Error('未解析出任何流水记录');
      parsed.push({file:f,out});step.innerHTML=`<b>${esc(f.name)}</b><span class="replace-ok">✓ ${esc(out.detectedType||'账单')} · ${out.records.length} 条</span>`;
    }catch(e){step.innerHTML=`<b>${esc(f.name)}</b><span class="replace-error">✕ ${esc(e.message)}</span>`;throw new Error(`${f.name}：${e.message}`)}
  }
  return parsed;
};
const prepare=parsed=>{
  const seen=new Map(),records=[],stats=new Map();
  for(const {file,out} of parsed){let added=0,skipped=0;for(const raw of out.records){const r=B.ensureId(raw),key=r.fingerprint||r.id;if(seen.has(key)){skipped++;continue}seen.set(key,r.id);records.push(r);added++}stats.set(out.batchId,{file,out,added,skipped})}
  if(typeof B.autoDedup==='function')B.autoDedup(records);
  const now=B.nowISO(),batches=[...stats.values()].map(({file,out,added,skipped})=>({id:out.batchId,name:file.name,fileName:file.name,detectedType:out.detectedType||'账单',summary:out.summary||{},periodStart:out.summary?.periodStart||'',periodEnd:out.summary?.periodEnd||'',addedCount:added,skippedCount:skipped,importedAt:now,note:'替换全部流水 · 浏览器本地解析'}));
  return{records,batches};
};
const replaceAll=async files=>{
  if(!files.length)return;
  if(!B.state?.db)throw new Error('本地数据库尚未初始化，请稍后重试');
  const parsed=await parseAll(files),{records,batches}=prepare(parsed);
  appendProgress(`<div><b>预检查完成</b><span class="replace-ok">✓ ${files.length} 个文件均解析成功 · 去除文件内完全重复后 ${records.length} 条流水</span></div>`);
  const names=parsed.map(x=>`${x.file.name}（${x.out.records.length}条）`).join('\n');
  if(!confirm(`已成功解析 ${files.length} 个文件：\n\n${names}\n\n准备写入 ${records.length} 条流水。\n\n确认后将删除本浏览器当前全部旧流水和旧导入批次，并替换为这批新账单。分类设置、旅游日期、手势映射等设置不会删除。\n\n是否继续？`)){appendProgress('<div><b>已取消</b><span>旧流水保持不变。</span></div>');return}
  appendProgress('<div><b>正在替换本地数据库</b><span>使用同一个 IndexedDB 事务执行“清空旧流水 + 写入新流水”。</span></div>');
  await atomicReplace(records,batches);
  B.state.page=1;if(B.swipeState){B.swipeState.cursor=0;B.swipeState.history=[];B.swipeState.busy=false}
  ['q','sourceFilter','directionFilter','manualFilter','categoryFilter','dateFrom','dateTo'].forEach(id=>{const el=B.$(id);if(el)el.value=''});
  B.invalidateInclusion?.();await B.load();
  appendProgress(`<div><b>替换完成</b><span class="replace-ok">✓ 当前数据库 ${B.state.records.length} 条流水 · ${B.state.batches.length} 个新导入批次</span></div>`);
  B.toast?.(`已替换为新账单：${B.state.records.length} 条流水`);
};
if(choose){const oldChoose=choose.onclick;choose.onclick=e=>{mode='incremental';return oldChoose?.call(choose,e)}}
input.onchange=async e=>{const files=[...input.files];try{if(mode==='replace')await replaceAll(files);else if(typeof normalHandler==='function')await normalHandler.call(input,e)}catch(err){console.error(err);appendProgress(`<div><b>替换失败</b><span class="replace-error">${esc(err.message)}</span><span>旧流水未被替换。</span></div>`);B.toast?.('替换失败：'+err.message)}finally{input.value='';mode='incremental'}};
ensureUI();
})();