(()=>{'use strict';const B=window.BO;
B.bind=()=>{
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
    if(e.target.matches('[data-include-id]')){
      B.updateInclude?.(e.target.dataset.includeId,e.target.checked);
    }
  };
  B.$('ledgerBody').onclick=e=>{const x=e.target.closest('[data-detail-id]');if(x)B.showDetail(x.dataset.detailId)};
  B.$('closeDetail').onclick=()=>B.$('detailDialog').close();

  const saveTravel=async()=>{
    B.state.settings.travelStart=B.$('travelStart').value||'2026-08-08';
    B.state.settings.travelEnd=B.$('travelEnd').value||B.state.settings.travelStart;
    if(B.state.settings.travelEnd<B.state.settings.travelStart){
      B.state.settings.travelEnd=B.state.settings.travelStart;
      B.$('travelEnd').value=B.state.settings.travelEnd;
      B.toast('旅游结束日期不能早于开始日期，已自动调整');
    }
    await B.put('settings',{key:'travelStart',value:B.state.settings.travelStart});
    await B.put('settings',{key:'travelEnd',value:B.state.settings.travelEnd});
    B.invalidateInclusion?.();B.recomputeRefunds();B.renderAll();
  };
  B.$('travelStart').onchange=saveTravel;
  B.$('travelEnd').onchange=saveTravel;

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
    B.$('exportManual').disabled=document.querySelector('input[name="exportScope"]:checked').value!=='manual';
    B.renderExportPreview();
  });
  ['exportManual','exportFrom','exportTo','exportDedup','exportRawFields','exportSummary'].forEach(id=>B.$(id).onchange=B.renderExportPreview);
  document.querySelectorAll('.format').forEach(x=>x.onclick=()=>B.exportData(x.dataset.format));

  B.$('backupBtn').onclick=B.backup;B.$('backupBtn2').onclick=B.backup;
  B.$('restoreBtn').onclick=()=>B.$('restoreInput').click();
  B.$('restoreInput').onchange=async()=>{
    const f=B.$('restoreInput').files[0];
    if(f)try{await B.restore(f)}catch(e){B.toast('恢复失败：'+e.message)}
    B.$('restoreInput').value='';
  };
  B.$('resetBtn').onclick=async()=>{
    if(!confirm('确定清空本浏览器中的全部账单、分类和导入记录？请先备份。'))return;
    await B.clear('records');await B.clear('batches');B.state.records=[];B.state.batches=[];
    B.invalidateInclusion?.();B.recomputeRefunds();B.renderAll();B.toast('本地数据库已清空');
  };
  B.$('migrateBtn').onclick=()=>{
    B.$('fileInput').accept='.html';B.$('fileInput').click();
    setTimeout(()=>B.$('fileInput').accept='.csv,.txt,.xls,.xlsx,.pdf,.json,.html',0);
  };
};
B.init=async()=>{
  try{B.state.db=await B.openDB();B.bind();await B.load()}
  catch(e){console.error(e);document.body.insertAdjacentHTML('afterbegin',`<div style="background:#fee;color:#900;padding:12px">初始化失败：${B.esc(e.message)}</div>`)}
};
B.init();
})();