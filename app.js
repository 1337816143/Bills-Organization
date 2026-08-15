(()=>{'use strict';const B=window.BO;

const sumClass=(rows,selector)=>rows.filter(r=>selector(r)).reduce((s,r)=>s+B.impact(r),0);
B.summaryRows=()=>{
  B.refreshInclusion?.();
  const from=B.state.settings.summaryFrom||'',to=B.state.settings.summaryTo||'';
  return B.state.records.filter(r=>B.isIncluded?.(r)!==false).filter(r=>{
    const d=B.dateOnly(r.time);if(!d)return !from&&!to;
    return(!from||d>=from)&&(!to||d<=to);
  });
};
B.metrics=()=>{
  const rows=B.summaryRows(),exp=rows.reduce((s,r)=>s+B.expense(r),0),inc=rows.reduce((s,r)=>s+B.income(r),0);
  const autoPrep=sumClass(rows,r=>B.autoTravel(r).code==='prep'),autoDT=sumClass(rows,r=>B.autoTravel(r).code==='during_travel'),autoDN=sumClass(rows,r=>B.autoTravel(r).code==='during_nontravel');
  const prep=sumClass(rows,r=>B.finalTravelClass(r)==='prep'),dt=sumClass(rows,r=>B.finalTravelClass(r)==='during_travel'),dn=sumClass(rows,r=>B.finalTravelClass(r)==='during_nontravel');
  B.$('mExpense').textContent=B.money(exp);B.$('mIncome').textContent=B.money(inc);B.$('mNet').textContent=B.money(exp-inc);
  B.$('mExpenseCount').textContent=`${rows.filter(r=>r.direction==='支出'||B.state.refundOffsetIds.has(r.id)).length} 笔`;
  B.$('mIncomeCount').textContent=`${rows.filter(r=>r.direction==='收入').length} 笔`;
  B.$('mTravel').textContent=B.money(prep+dt);B.$('mPeriod').textContent=B.money(dt+dn);
  if(B.$('mTravelTotal'))B.$('mTravelTotal').textContent=B.money(prep+dt+dn);
  B.$('mUnknown').textContent=rows.filter(r=>B.autoTravel(r).confidence==='低'&&B.manualSelection(r)==='auto'&&B.impact(r)!==0).length;
  if(B.$('aPrep'))B.$('aPrep').textContent=B.money(autoPrep);
  if(B.$('aDuringTravel'))B.$('aDuringTravel').textContent=B.money(autoDT);
  if(B.$('aDuringNonTravel'))B.$('aDuringNonTravel').textContent=B.money(autoDN);
  if(B.$('aTravelTotal'))B.$('aTravelTotal').textContent=B.money(autoPrep+autoDT+autoDN);
  if(B.$('aPureTravel'))B.$('aPureTravel').textContent=B.money(autoPrep+autoDT);
  const indicator=B.$('summaryRangeIndicator');
  if(indicator){
    const from=B.state.settings.summaryFrom||'',to=B.state.settings.summaryTo||'';
    indicator.innerHTML=`<b>总统计范围：</b>${B.esc(from||'最早记录')} ～ ${B.esc(to||'最新记录')}<span>顶部全部汇总仅统计该日期范围内、且当前“计入统计”的记录</span>`;
  }
};

B.ensureSummaryRangeControls=()=>{
  if(B.$('summaryFrom'))return;
  const side=document.querySelector('.hero-side');if(!side)return;
  const block=document.createElement('div');block.className='summary-range-block';
  block.innerHTML=`<div class="summary-range-title"><b>总统计日期</b><button type="button" class="summary-range-clear" id="summaryRangeClear">全部日期</button></div>
    <label>总统计开始日期<input type="date" id="summaryFrom" /></label>
    <label>总统计结束日期<input type="date" id="summaryTo" /></label>
    <small>只影响页面顶部总统计与自动旅游汇总；不改变旅游分类边界，也不改变流水明细自己的筛选。</small>`;
  const oldSmall=side.querySelector(':scope > small');
  if(oldSmall)oldSmall.insertAdjacentElement('afterend',block);else side.appendChild(block);
  const metrics=B.$('metrics');if(metrics&&!B.$('summaryRangeIndicator')){
    const note=document.createElement('div');note.id='summaryRangeIndicator';note.className='summary-range-indicator';metrics.insertAdjacentElement('beforebegin',note);
  }
  if(!document.getElementById('summaryRangeRuntimeStyle')){
    const style=document.createElement('style');style.id='summaryRangeRuntimeStyle';style.textContent=`
      .summary-range-block{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.2)}
      .summary-range-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;color:#fff}
      .summary-range-clear{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.1);color:#fff;border-radius:7px;padding:4px 8px;font-size:11px;cursor:pointer}
      .summary-range-block label+label{margin-top:8px}.summary-range-block small{margin-top:8px!important}
      .summary-range-indicator{margin:14px 2px -4px;padding:9px 12px;border:1px solid #d8e0f0;background:#f8faff;border-radius:10px;color:#34405a;font-size:12px}
      .summary-range-indicator b{color:#172033}.summary-range-indicator span{margin-left:10px;color:#71798a}
      @media(max-width:800px){.summary-range-indicator span{display:block;margin:2px 0 0}}
    `;document.head.appendChild(style);
  }
};

B.bind=()=>{
  B.ensureSummaryRangeControls();
  document.querySelectorAll('.nav').forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');B.$(`view-${btn.dataset.view}`).classList.add('active');
    if(btn.dataset.view==='export')B.renderExportPreview();
    if(btn.dataset.view==='stats')B.renderTimeStats?.();
  });
  document.querySelectorAll('.segmented button').forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll('.segmented button').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');B.state.mode=btn.dataset.mode;B.state.page=1;B.renderLedger();
  });
  ['q','sourceFilter','directionFilter','manualFilter','dateFrom','dateTo'].forEach(id=>B.$(id).addEventListener(id==='q'?'input':'change',()=>{
    B.state.page=1;B.renderLedger();
  }));
  B.$('clearFilters').onclick=()=>{
    ['q','sourceFilter','directionFilter','manualFilter','dateFrom','dateTo'].forEach(id=>B.$(id).value='');
    B.state.page=1;B.renderLedger();
  };
  B.$('prevPage').onclick=()=>{B.state.page--;B.renderLedger()};
  B.$('nextPage').onclick=()=>{B.state.page++;B.renderLedger()};
  B.$('ledgerBody').onchange=e=>{
    if(e.target.matches('.class-select')){
      e.target.className=`class-select ${e.target.value}`;
      B.updateManual(e.target.dataset.classId,e.target.value);
      return;
    }
    if(e.target.matches('[data-include-id]'))B.updateInclude?.(e.target.dataset.includeId,e.target.checked);
  };
  B.$('ledgerBody').onclick=e=>{const x=e.target.closest('[data-detail-id]');if(x)B.showDetail(x.dataset.detailId)};
  B.$('closeDetail').onclick=()=>B.$('detailDialog').close();

  const saveTravel=async()=>{
    B.state.settings.travelStart=B.$('travelStart').value||'2026-08-08';
    B.state.settings.travelEnd=B.$('travelEnd').value||B.state.settings.travelStart;
    if(B.state.settings.travelEnd<B.state.settings.travelStart){
      B.state.settings.travelEnd=B.state.settings.travelStart;B.$('travelEnd').value=B.state.settings.travelEnd;
      B.toast('旅游结束日期不能早于开始日期，已自动调整');
    }
    await B.put('settings',{key:'travelStart',value:B.state.settings.travelStart});
    await B.put('settings',{key:'travelEnd',value:B.state.settings.travelEnd});
    B.invalidateInclusion?.();B.recomputeRefunds();B.renderAll();
  };
  B.$('travelStart').onchange=saveTravel;B.$('travelEnd').onchange=saveTravel;

  const saveSummary=async changed=>{
    let from=B.$('summaryFrom').value||'',to=B.$('summaryTo').value||'';
    if(from&&to&&from>to){
      if(changed==='summaryFrom'){to=from;B.$('summaryTo').value=to}else{from=to;B.$('summaryFrom').value=from}
      B.toast('总统计结束日期不能早于开始日期，已自动调整');
    }
    B.state.settings.summaryFrom=from;B.state.settings.summaryTo=to;
    await B.put('settings',{key:'summaryFrom',value:from});await B.put('settings',{key:'summaryTo',value:to});
    B.renderAll();
  };
  B.$('summaryFrom').onchange=()=>saveSummary('summaryFrom');B.$('summaryTo').onchange=()=>saveSummary('summaryTo');
  B.$('summaryRangeClear').onclick=async()=>{
    B.$('summaryFrom').value='';B.$('summaryTo').value='';B.state.settings.summaryFrom='';B.state.settings.summaryTo='';
    await B.put('settings',{key:'summaryFrom',value:''});await B.put('settings',{key:'summaryTo',value:''});B.renderAll();
  };

  ['statFrom','statTo'].forEach(id=>B.$(id).addEventListener('change',()=>B.renderTimeStats?.()));
  document.querySelectorAll('.stat-quick').forEach(btn=>btn.onclick=()=>{
    const now=new Date(),pad=n=>String(n).padStart(2,'0'),fmt=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if(btn.dataset.range==='all'){B.$('statFrom').value='';B.$('statTo').value=''}
    else if(btn.dataset.range==='7d'){const f=new Date(now);f.setDate(f.getDate()-6);f.setHours(0,0,0,0);B.$('statFrom').value=fmt(f);B.$('statTo').value=fmt(now)}
    else if(btn.dataset.range==='month'){const f=new Date(now.getFullYear(),now.getMonth(),1,0,0,0);B.$('statFrom').value=fmt(f);B.$('statTo').value=fmt(now)}
    B.renderTimeStats?.();
  });

  const open=()=>{B.$('importProgress').innerHTML='';B.$('importDialog').showModal()};
  B.$('importBtn').onclick=open;B.$('importBtn2').onclick=open;B.$('closeImport').onclick=()=>B.$('importDialog').close();
  B.$('chooseFiles').onclick=()=>B.$('fileInput').click();
  B.$('fileInput').onchange=async()=>{await B.importFiles([...B.$('fileInput').files]);B.$('fileInput').value=''};
  const dz=B.$('dropzone');
  ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag')}));
  ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag')}));
  dz.addEventListener('drop',e=>B.importFiles([...e.dataTransfer.files]));

  document.querySelectorAll('input[name="exportScope"]').forEach(x=>x.onchange=()=>{
    B.$('exportManual').disabled=document.querySelector('input[name="exportScope"]:checked').value!=='manual';B.renderExportPreview();
  });
  ['exportManual','exportFrom','exportTo','exportDedup','exportRawFields','exportSummary'].forEach(id=>B.$(id).onchange=B.renderExportPreview);
  document.querySelectorAll('.format').forEach(x=>x.onclick=()=>B.exportData(x.dataset.format));

  B.$('backupBtn').onclick=B.backup;B.$('backupBtn2').onclick=B.backup;B.$('restoreBtn').onclick=()=>B.$('restoreInput').click();
  B.$('restoreInput').onchange=async()=>{
    const f=B.$('restoreInput').files[0];if(f)try{await B.restore(f)}catch(e){B.toast('恢复失败：'+e.message)}B.$('restoreInput').value='';
  };
  B.$('resetBtn').onclick=async()=>{
    if(!confirm('确定清空本浏览器中的全部账单、分类和导入记录？请先备份。'))return;
    await B.clear('records');await B.clear('batches');B.state.records=[];B.state.batches=[];
    B.invalidateInclusion?.();B.recomputeRefunds();B.renderAll();B.toast('本地数据库已清空');
  };
  B.$('migrateBtn').onclick=()=>{
    B.$('fileInput').accept='.html';B.$('fileInput').click();setTimeout(()=>B.$('fileInput').accept='.csv,.txt,.xls,.xlsx,.pdf,.json,.html',0);
  };
};
B.init=async()=>{
  try{
    B.state.db=await B.openDB();B.bind();await B.load();
    B.$('summaryFrom').value=B.state.settings.summaryFrom||'';B.$('summaryTo').value=B.state.settings.summaryTo||'';B.metrics();
  }catch(e){console.error(e);document.body.insertAdjacentHTML('afterbegin',`<div style="background:#fee;color:#900;padding:12px">初始化失败：${B.esc(e.message)}</div>`)}
};
B.init();
})();
