const views=[...document.querySelectorAll('.view')];
const tabs=[...document.querySelectorAll('.tab')];
const networkStatus=document.getElementById('networkStatus');
const homeProgrammeCount=document.getElementById('homeProgrammeCount');
const homeProgrammeNames=document.getElementById('homeProgrammeNames');
const programmeRegistry=new Map();

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

function programmeName(programmeId){
  return programmeRegistry.get(programmeId)?.name||programmeId;
}

function renderHomeProgrammeSummary(data){
  const count=data.length;
  homeProgrammeCount.textContent=`${count} connected programme${count===1?'':'s'}`;
  homeProgrammeNames.textContent=count?data.map(item=>item.name).join(' + '):'No programmes registered.';
}

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
    programmeRegistry.clear();
    data.forEach(item=>programmeRegistry.set(item.programmeId,item));
    MzansiUMLAImport.configure(data);
    renderHomeProgrammeSummary(data);
    learning.innerHTML=data.map(item=>programmeCard(item,true)).join('');
    programmes.innerHTML=data.map(item=>programmeCard(item,false)).join('');
    return true;
  }catch(error){
    programmeRegistry.clear();
    MzansiUMLAImport.configure([]);
    renderHomeProgrammeSummary([]);
    const fallback='<article class="programme-card"><h3>Learning programmes</h3><p>Programme registry unavailable. The offline shell is still active.</p></article>';
    learning.innerHTML=fallback;programmes.innerHTML=fallback;
    return false;
  }
}

function scoreText(score){
  if(!score||typeof score!=='object') return '—';
  return `${score.raw ?? '—'}/${score.max ?? '—'}${score.percent!=null?` (${score.percent}%)`:''}`;
}

function progressCard(record){
  return `<div class="programme-card">
    <div class="progress-row"><span>${programmeName(record.programmeId)}</span><strong>${scoreText(record.score)}</strong></div>
    <div class="progress-track"><div class="progress-fill" style="width:${record.score?.percent||0}%"></div></div>
    <p><strong>${record.moduleId} • ${record.activityId}</strong></p>
    <p class="helper">Outcome: ${record.outcome} • Sync: ${record.syncStatus} • Imported locally</p>
  </div>`;
}

async function renderProgress(){
  const box=document.getElementById('progressSummary');
  const records=await MzansiUMLAImport.list();
  if(!records.length){box.innerHTML='<p class="helper">No imported UMLA record yet.</p>';return;}
  const latestByProgramme=new Map();
  records.forEach(record=>latestByProgramme.set(record.programmeId,record));
  box.innerHTML=[...latestByProgramme.values()].map(progressCard).join('');
}

async function importRecordObject(record){
  const result=document.getElementById('importResult');
  const imported=await MzansiUMLAImport.importRecord(record);
  if(!imported.valid){
    result.innerHTML=`<strong>IMPORT BLOCKED</strong><p>${imported.errors.join(' ')}</p>`;
    return;
  }
  result.innerHTML=`<strong>${imported.duplicate?'ALREADY IMPORTED':'IMPORT PASS'}</strong><p>${programmeName(record.programmeId)} • ${record.moduleId} • ${record.activityId} • ${scoreText(record.score)}</p>`;
  await renderProgress();
}

function extractUmlaEvent(payload){
  if(payload?.handoffVersion==='UMLA-HANDOFF-0.1'){
    if(!Array.isArray(payload.events)||!payload.events.length){
      throw new Error('UMLA handoff contains no events');
    }
    return payload.events[0];
  }
  return payload;
}

document.getElementById('importUmlaBtn').addEventListener('click',async()=>{
  const input=document.getElementById('umlaFileInput');
  const result=document.getElementById('importResult');
  if(!input.files?.length){result.textContent='Choose a UMLA JSON file first.';return;}
  try{
    const text=await input.files[0].text();
    const payload=JSON.parse(text);
    await importRecordObject(extractUmlaEvent(payload));
  }catch(error){result.textContent='Import failed. Check that the selected file contains a valid UMLA learning record.';}
});

document.getElementById('loadFixtureBtn').addEventListener('click',async()=>{
  const result=document.getElementById('importResult');
  try{
    const response=await fetch('./fixtures/boilermaker-km04-l03-umla.json');
    await importRecordObject(await response.json());
  }catch(error){result.textContent='Pilot fixture could not be loaded.';}
});

if('serviceWorker'in navigator){addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.error));}
loadProgrammes().then(renderProgress);
