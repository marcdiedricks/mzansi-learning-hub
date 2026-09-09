const views=[...document.querySelectorAll('.view')];
const tabs=[...document.querySelectorAll('.tab')];
const networkStatus=document.getElementById('networkStatus');

function openView(id){
  views.forEach(view=>view.classList.toggle('active',view.id===id));
  tabs.forEach(tab=>tab.classList.toggle('active',tab.dataset.view===id));
  window.scrollTo({top:0,behavior:'smooth'});
}

tabs.forEach(tab=>tab.addEventListener('click',()=>openView(tab.dataset.view)));
document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>openView(button.dataset.open)));

function updateNetwork(){
  const online=navigator.onLine;
  networkStatus.textContent=online?'ONLINE':'OFFLINE';
  networkStatus.style.background=online?'#dcfce7':'#fee2e2';
}
addEventListener('online',updateNetwork);addEventListener('offline',updateNetwork);updateNetwork();

function programmeCard(programme,learning=false){
  return `<article class="programme-card">
    <p class="eyebrow">${programme.category.toUpperCase()} • ${programme.status.toUpperCase()}</p>
    <h3>${programme.name}</h3>
    <p class="programme-meta">${programme.qualificationId} • ${programme.schemaVersion}</p>
    <p class="helper">${learning?'Progress is shown from imported UMLA records.':'Learning remains inside the specialist PWA.'}</p>
    <a class="programme-link" href="${programme.pwaUrl}" target="_blank" rel="noopener noreferrer">Open ${programme.name}</a>
  </article>`;
}

async function loadProgrammes(){
  const learning=document.getElementById('learningCards');
  const programmes=document.getElementById('programmeCards');
  try{
    const response=await fetch('./programmes.json');
    const data=await response.json();
    learning.innerHTML=data.map(item=>programmeCard(item,true)).join('');
    programmes.innerHTML=data.map(item=>programmeCard(item,false)).join('');
  }catch(error){
    const fallback='<article class="programme-card"><h3>Mzansi Boilermaker</h3><p>Programme registry unavailable. The offline shell is still active.</p></article>';
    learning.innerHTML=fallback;programmes.innerHTML=fallback;
  }
}

function scoreText(score){
  if(!score||typeof score!=='object') return '—';
  return `${score.raw ?? '—'}/${score.max ?? '—'}${score.percent!=null?` (${score.percent}%)`:''}`;
}

async function renderProgress(){
  const box=document.getElementById('progressSummary');
  const latest=await MzansiUMLAImport.latest();
  if(!latest){box.innerHTML='<p class="helper">No imported UMLA record yet.</p>';return;}
  box.innerHTML=`<div class="progress-row"><span>Mzansi Boilermaker</span><strong>${scoreText(latest.score)}</strong></div>
    <div class="progress-track"><div class="progress-fill" style="width:${latest.score?.percent||0}%"></div></div>
    <p><strong>${latest.moduleId} • ${latest.activityId}</strong></p>
    <p class="helper">Outcome: ${latest.outcome} • Sync: ${latest.syncStatus} • Imported locally</p>`;
}

async function importRecordObject(record){
  const result=document.getElementById('importResult');
  const imported=await MzansiUMLAImport.importRecord(record);
  if(!imported.valid){
    result.innerHTML=`<strong>IMPORT BLOCKED</strong><p>${imported.errors.join(' ')}</p>`;
    return;
  }
  result.innerHTML=`<strong>${imported.duplicate?'ALREADY IMPORTED':'IMPORT PASS'}</strong><p>${record.moduleId} • ${record.activityId} • ${scoreText(record.score)}</p>`;
  await renderProgress();
}

document.getElementById('importUmlaBtn').addEventListener('click',async()=>{
  const input=document.getElementById('umlaFileInput');
  const result=document.getElementById('importResult');
  if(!input.files?.length){result.textContent='Choose a UMLA JSON file first.';return;}
  try{
    const text=await input.files[0].text();
    await importRecordObject(JSON.parse(text));
  }catch(error){result.textContent='Import failed. Check that the selected file contains valid JSON.';}
});

document.getElementById('loadFixtureBtn').addEventListener('click',async()=>{
  const result=document.getElementById('importResult');
  try{
    const response=await fetch('./fixtures/boilermaker-km04-l03-umla.json');
    await importRecordObject(await response.json());
  }catch(error){result.textContent='Pilot fixture could not be loaded.';}
});

if('serviceWorker'in navigator){addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.error));}
loadProgrammes();renderProgress();
