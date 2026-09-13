const views=[...document.querySelectorAll('.view')];
const tabs=[...document.querySelectorAll('.tab')];
const networkStatus=document.getElementById('networkStatus');
const homeProgrammeCount=document.getElementById('homeProgrammeCount');
const homeProgrammeNames=document.getElementById('homeProgrammeNames');
const programmeRegistry=new Map();
const programmeConfigs=new Map();

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

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function programmeName(programmeId){
  return programmeRegistry.get(programmeId)?.name||programmeId;
}

function renderHomeProgrammeSummary(data){
  const count=data.length;
  homeProgrammeCount.textContent=`${count} connected programme${count===1?'':'s'}`;
  homeProgrammeNames.textContent=count?data.map(item=>item.name).join(' + '):'No programmes registered.';
}

function programmeCard(programme,learning=false){
  const recordsEnabled=programme.learningRecordsEnabled!==false;
  const recordLabel=recordsEnabled?(programme.schemaVersion||'UMLA-LR-0.1'):'Standalone only';
  const activationLabel=programme.activationState?programme.activationState.replaceAll('_',' '):'ACTIVE';
  const integrationText=programmeConfigs.has(programme.programmeId)
    ?'Validated pathway definition connected.'
    :recordsEnabled
      ?'Learning records accepted; programme-level progress withheld until a validated pathway is connected.'
      :'Standalone PWA registered. UMLA learning-record integration is not enabled.';
  return `<article class="programme-card">
    <p class="eyebrow">${escapeHtml(programme.category).toUpperCase()} • ${escapeHtml(programme.status).toUpperCase()}</p>
    <h3>${escapeHtml(programme.name)}</h3>
    <p class="programme-meta">${escapeHtml(programme.qualificationId||'No qualification ID')} • ${escapeHtml(recordLabel)}</p>
    <p class="activation-pill">${escapeHtml(activationLabel)}</p>
    <p class="helper">${escapeHtml(integrationText)}</p>
    ${learning?(programme.enrolmentEnabled===false
      ?'<button class="secondary-btn" type="button" disabled>Enrolment locked</button>'
      :`<button class="secondary-btn" type="button" data-enrol="${escapeHtml(programme.programmeId)}">Enrol locally</button>`):''}
    <a class="programme-link" href="${escapeHtml(programme.pwaUrl)}" target="_blank" rel="noopener noreferrer">Open ${escapeHtml(programme.name)}</a>
  </article>`;
}

async function loadProgrammeConfig(programme){
  if(programme.programmeConfigObject){
    const check=MzansiLMSCore.validateProgrammeConfig(programme.programmeConfigObject,programme);
    if(!check.valid) throw new Error(`${programme.programmeId}: ${check.errors.join(' ')}`);
    programmeConfigs.set(programme.programmeId,programme.programmeConfigObject);
    return;
  }
  if(!programme.programmeConfig) return;
  const response=await fetch(programme.programmeConfig);
  if(!response.ok) throw new Error(`Programme config unavailable for ${programme.programmeId}`);
  const config=await response.json();
  const check=MzansiLMSCore.validateProgrammeConfig(config,programme);
  if(!check.valid) throw new Error(`${programme.programmeId}: ${check.errors.join(' ')}`);
  programmeConfigs.set(programme.programmeId,config);
}

function bindEnrolButtons(){
  document.querySelectorAll('[data-enrol]').forEach(button=>button.addEventListener('click',async()=>{
    try{
      await MzansiLMSCore.enrol(button.dataset.enrol);
      button.textContent='Enrolled locally';
      button.disabled=true;
      await renderProfile();
      await renderReports();
    }catch(error){
      button.textContent='Enrolment blocked';
    }
  }));
}

async function loadProgrammes(){
  const learning=document.getElementById('learningCards');
  const programmes=document.getElementById('programmeCards');
  const response=await fetch('./programmes.json');
  if(!response.ok) throw new Error('Programme registry unavailable');
  const builtIn=await response.json();
  const localPackages=globalThis.MzansiProgrammePackageManager
    ? await MzansiProgrammePackageManager.listRegistered()
    : [];
  const localProgrammes=localPackages.map(pkg=>MzansiProgrammePackageManager.toRegistryEntry(pkg));
  const data=[...builtIn,...localProgrammes];
  programmeRegistry.clear();
  programmeConfigs.clear();

  const registryErrors=[];
  data.forEach(item=>{
    const check=MzansiLMSCore.validateRegistryEntry(item);
    if(!check.valid) registryErrors.push(...check.errors.map(error=>`${item?.programmeId||'programme'}: ${error}`));
    else if(programmeRegistry.has(item.programmeId)) registryErrors.push(`${item.programmeId}: duplicate programmeId.`);
    else programmeRegistry.set(item.programmeId,item);
  });
  if(registryErrors.length) throw new Error(registryErrors.join(' '));

  await Promise.all(data.map(loadProgrammeConfig));
  const coreCheck=MzansiLMSCore.configure(data,programmeConfigs);
  if(!coreCheck.valid) throw new Error(coreCheck.errors.join(' '));
  MzansiUMLAImport.configure(data.filter(item=>item.learningRecordsEnabled!==false));
  renderHomeProgrammeSummary(data);
  learning.innerHTML=data.map(item=>programmeCard(item,true)).join('');
  programmes.innerHTML=data.map(item=>programmeCard(item,false)).join('');
  bindEnrolButtons();
  return data;
}

function scoreText(score){
  if(!score||typeof score!=='object') return '—';
  return `${score.raw ?? '—'}/${score.max ?? '—'}${score.percent!=null?` (${score.percent}%)`:''}`;
}

function legacyProgressCard(record){
  return `<div class="programme-card">
    <div class="progress-row"><span>${programmeName(record.programmeId)}</span><strong>Programme progress withheld</strong></div>
    <p><strong>${record.moduleId} • ${record.activityId}</strong></p>
    <p class="helper">Latest assessment: ${scoreText(record.score)} • ${record.outcome}. A quiz score is not treated as whole-programme progress.</p>
  </div>`;
}

function moduleSummary(module){
  if(module.status==='PARTIAL_DEFINITION'){
    return `${module.moduleId}: pathway definition incomplete${module.knownRequired?` • ${module.knownSatisfied}/${module.knownRequired} currently mapped activities satisfied`:''}`;
  }
  return `${module.moduleId}: ${module.status.replace(/_/g,' ')}${module.percent!=null?` • ${module.percent}%`:''}`;
}

function pathwayProgressCard(programmeId,progress){
  const visibleModules=[];
  progress.stages.forEach(stage=>stage.modules.forEach(module=>{
    if(module.knownSatisfied>0||module.complete) visibleModules.push(module);
  }));
  const next=progress.nextRequired;
  const nextRule=next?.completionRule;
  const ruleText=nextRule
    ? [
        Array.isArray(nextRule.requiredEventTypes)&&nextRule.requiredEventTypes.length
          ? 'event '+nextRule.requiredEventTypes.join(' or ')
          : null,
        typeof nextRule.minimumScorePercent==='number'
          ? 'minimum '+nextRule.minimumScorePercent+'%'
          : null
      ].filter(Boolean).join(' • ')
    : '';
  const nextText=next?.blockedReason==='MODULE_DEFINITION_INCOMPLETE'
    ? `Next pathway step is blocked at ${next.moduleId} until its programme definition is complete.`
    : next?.activityId
      ? `Next required activity: ${next.moduleId} • ${next.activityId}${ruleText?' • requires '+ruleText:''}`
      : 'No next required activity is currently defined.';
  const headline=progress.percent==null?'Programme progress withheld':`${progress.percent}% programme progress`;
  const bar=progress.percent==null?'':`<div class="progress-track"><div class="progress-fill" style="width:${progress.percent}%"></div></div>`;
  return `<div class="programme-card">
    <div class="progress-row"><span>${programmeName(programmeId)}</span><strong>${headline}</strong></div>
    ${bar}
    ${visibleModules.length?visibleModules.map(module=>`<p><strong>${moduleSummary(module)}</strong></p>`).join(''):'<p class="helper">No required activity has been satisfied yet.</p>'}
    <p class="helper">${nextText}</p>
    ${progress.warning?`<p class="helper">${progress.warning}</p>`:''}
  </div>`;
}

function recordsByProgramme(records){
  const grouped=new Map();
  records.forEach(record=>{
    if(!grouped.has(record.programmeId)) grouped.set(record.programmeId,[]);
    grouped.get(record.programmeId).push(record);
  });
  return grouped;
}

async function learnerRecords(){
  const learner=await MzansiLMSCore.getOrCreateLearner();
  const records=await MzansiUMLAImport.list();
  return records.filter(record=>MzansiLMSCore.recordBelongsToLearner(record,learner));
}

async function renderProgress(){
  const box=document.getElementById('progressSummary');
  const records=await learnerRecords();
  if(!records.length){box.innerHTML='<p class="helper">No linked UMLA learning record yet.</p>';return;}
  const grouped=recordsByProgramme(records);
  const cards=[];
  for(const [programmeId,programmeRecords] of grouped){
    const config=programmeConfigs.get(programmeId);
    if(config){
      cards.push(pathwayProgressCard(programmeId,MzansiProgressEngine.calculate(config,programmeRecords)));
      continue;
    }
    const sorted=[...programmeRecords].sort((a,b)=>String(a.occurredAt||'').localeCompare(String(b.occurredAt||'')));
    cards.push(legacyProgressCard(sorted[sorted.length-1]));
  }
  box.innerHTML=cards.join('');
}

async function renderReports(){
  const box=document.getElementById('reportSummary');
  const records=await learnerRecords();
  const enrolments=await MzansiLMSCore.listEnrolments();
  const programmeIds=new Set([...records.map(record=>record.programmeId),...enrolments.map(item=>item.programmeId)]);
  if(!programmeIds.size){box.innerHTML='<p class="helper">No reportable learning records or enrolments yet.</p>';return;}
  const cards=[];
  programmeIds.forEach(programmeId=>{
    if(!programmeRegistry.has(programmeId)) return;
    const report=MzansiLMSCore.report(programmeId,records);
    const status=report.percent==null?report.pathwayStatus:`${report.percent}% • ${report.pathwayStatus}`;
    const next=report.nextRequired?.activityId?`${report.nextRequired.moduleId} • ${report.nextRequired.activityId}`:report.nextRequired?.blockedReason?`${report.nextRequired.moduleId} • definition incomplete`:'Not yet defined';
    cards.push(`<article class="programme-card">
      <div class="progress-row"><span>${report.programmeName}</span><strong>${status.replace(/_/g,' ')}</strong></div>
      <p>Learning records: <strong>${report.recordCount}</strong></p>
      <p>Last activity: <strong>${report.lastActivityId||'None yet'}</strong></p>
      <p>Next required: <strong>${next}</strong></p>
      ${report.warning?`<p class="helper">${report.warning}</p>`:''}
    </article>`);
  });
  box.innerHTML=cards.join('')||'<p class="helper">No reportable programmes yet.</p>';
}

async function renderProfile(){
  const box=document.getElementById('profileSummary');
  const learner=await MzansiLMSCore.getOrCreateLearner();
  const enrolments=await MzansiLMSCore.listEnrolments();
  const linked=Array.isArray(learner.sourceIdentities)?learner.sourceIdentities.length:0;
  box.innerHTML=`<p><strong>Local learner ID</strong></p><p class="helper">${learner.learnerId}</p><p><strong>${enrolments.length}</strong> local enrolment${enrolments.length===1?'':'s'} • <strong>${linked}</strong> linked programme identit${linked===1?'y':'ies'}</p><p class="helper">Identity links, enrolments and learning records remain on this device. No cloud account is required.</p>`;
}

async function importRecords(records){
  const result=document.getElementById('importResult');
  if(!Array.isArray(records)||!records.length) throw new Error('No UMLA events found.');

  const checks=records.map(record=>({record,check:MzansiUMLAImport.validate(record)}));
  const blocked=checks.find(item=>!item.check.valid);
  if(blocked){
    result.innerHTML=`<strong>IMPORT BLOCKED</strong><p>${blocked.record?.activityId||'Unknown activity'}: ${blocked.check.errors.join(' ')}</p>`;
    return false;
  }

  const sourceLearners=new Map();
  for(const record of records){
    const existing=sourceLearners.get(record.programmeId);
    if(existing&&existing!==record.learnerId){
      result.innerHTML='<strong>IMPORT BLOCKED</strong><p>A single learner import cannot contain different learner identities for the same programme.</p>';
      return false;
    }
    sourceLearners.set(record.programmeId,record.learnerId);
  }

  try{
    for(const [programmeId,sourceLearnerId] of sourceLearners){
      await MzansiLMSCore.linkSourceLearner(programmeId,sourceLearnerId);
      await MzansiLMSCore.enrol(programmeId);
    }
  }catch(error){
    result.innerHTML=`<strong>IMPORT BLOCKED</strong><p>${error.message}</p>`;
    return false;
  }

  let importedCount=0;
  let duplicateCount=0;
  for(const record of records){
    const imported=await MzansiUMLAImport.importRecord(record);
    if(imported.duplicate) duplicateCount++;
    else importedCount++;
  }
  await Promise.all([renderProgress(),renderReports(),renderProfile()]);
  result.innerHTML=`<strong>IMPORT PASS</strong><p>${importedCount} imported • ${duplicateCount} already present • ${records.length} validated.</p>`;
  return true;
}

function extractUmlaEvents(payload){
  if(payload?.handoffVersion==='UMLA-HANDOFF-0.1'){
    if(!Array.isArray(payload.events)||!payload.events.length) throw new Error('UMLA handoff contains no events.');
    return payload.events;
  }
  return [payload];
}

document.getElementById('importUmlaBtn').addEventListener('click',async()=>{
  const input=document.getElementById('umlaFileInput');
  const result=document.getElementById('importResult');
  if(!input.files?.length){result.textContent='Choose a UMLA JSON file first.';return;}
  try{
    const payload=JSON.parse(await input.files[0].text());
    await importRecords(extractUmlaEvents(payload));
  }catch(error){result.textContent='Import failed. Check that the selected file contains valid UMLA learning records.';}
});

document.getElementById('loadFixtureBtn').addEventListener('click',async()=>{
  const result=document.getElementById('importResult');
  try{
    const response=await fetch('./fixtures/boilermaker-seven-activity-umla-handoff.json');
    if(!response.ok) throw new Error('Fixture unavailable');
    const payload=await response.json();
    if(payload?.handoffVersion!=='UMLA-HANDOFF-0.1'||!Array.isArray(payload.events)||payload.events.length!==7) throw new Error('Fixture invalid');
    const passed=await importRecords(payload.events);
    if(passed) result.innerHTML='<strong>7-EVENT FIXTURE PASS</strong><p>All seven events validated, linked to the local learner, and used to recalculate progress and reports.</p>';
  }catch(error){result.textContent='Seven-event Boilermaker fixture could not be loaded.';}
});

async function init(){
  try{
    await loadProgrammes();
    await MzansiLMSCore.getOrCreateLearner();
    await Promise.all([renderProgress(),renderReports(),renderProfile()]);
  }catch(error){
    programmeRegistry.clear();
    programmeConfigs.clear();
    MzansiUMLAImport.configure([]);
    renderHomeProgrammeSummary([]);
    const message='<article class="programme-card"><h3>LMS configuration blocked</h3><p class="helper">A programme or pathway definition failed validation. The LMS did not guess or activate invalid data.</p></article>';
    document.getElementById('learningCards').innerHTML=message;
    document.getElementById('programmeCards').innerHTML=message;
  }
}

globalThis.MzansiLearningHub={
  hasProgrammeId(programmeId){return programmeRegistry.has(programmeId);},
  async refreshProgrammes(){
    await loadProgrammes();
    await Promise.all([renderProgress(),renderReports(),renderProfile()]);
  }
};

addEventListener('mzansi:programmes-changed',()=>MzansiLearningHub.refreshProgrammes().catch(console.error));

if('serviceWorker'in navigator){addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.error));}
init();


const adapterDiagnosticsBtn=document.getElementById('runAdapterDiagnosticsBtn');
if(adapterDiagnosticsBtn){
  adapterDiagnosticsBtn.addEventListener('click',async()=>{
    const box=document.getElementById('adapterDiagnosticsResult');
    if(!box||!globalThis.MzansiOpenSourceAdapters){
      if(box) box.innerHTML='<strong>DIAGNOSTICS BLOCKED</strong><p>Adapter contract is unavailable.</p>';
      return;
    }
    const result=await MzansiOpenSourceAdapters.selfTest();
    const providerCard=(key,label)=>{
      const item=result.results?.[key];
      const structural=item?.valid===true;
      const providerMatch=item?.providerMatches===true;
      const safe=item?.safeStub===true;
      const health=item?.health?.ok===true;
      return `<div class="diag-row"><span>${label}</span><strong>${structural&&providerMatch&&safe&&health?'PASS':'CHECK'}</strong></div>
        <p class="helper">Contract ${structural?'PASS':'CHECK'} • Provider ${providerMatch?'PASS':'CHECK'} • Safe stub ${safe?'PASS':'CHECK'} • Health ${health?'PASS':'CHECK'}</p>`;
    };
    box.innerHTML=`<strong>${result.valid?'ADAPTER DIAGNOSTICS PASS':'ADAPTER DIAGNOSTICS CHECK'}</strong>
      ${providerCard('KOLIBRI','Kolibri')}
      ${providerCard('MOODLE','Moodle')}
      <p class="helper">Network used: NO • Authentication attempted: NO • Live sync: NO</p>`;
  });
}


const deploymentModeCards=document.getElementById('deploymentModeCards');
if(deploymentModeCards && globalThis.MzansiDeploymentModes){
  deploymentModeCards.innerHTML=Object.values(MzansiDeploymentModes.MODES).map(mode=>`
    <article class="mode-card">
      <div class="progress-row"><strong>${escapeHtml(mode.label)}</strong><span>${mode.serverRequired?'SERVER':'NO SERVER'}</span></div>
      <p class="helper">${escapeHtml(mode.description)}</p>
      <p class="helper">Local network: ${mode.localNetworkRequired?'REQUIRED':'NOT REQUIRED'} • Internet for core use: ${mode.internetRequiredForCoreUse?'YES':'NO'}</p>
      <p class="helper">Engines: ${mode.engines.length?mode.engines.join(' + '):'None required'}</p>
    </article>`).join('');
}

const kolibriPilotForm=document.getElementById('kolibriPilotForm');
if(kolibriPilotForm && globalThis.MzansiDeploymentModes){
  kolibriPilotForm.addEventListener('submit',event=>{
    event.preventDefault();
    const data=new FormData(kolibriPilotForm);
    const check=MzansiDeploymentModes.kolibriPilotReadiness({
      baseUrl:String(data.get('pilotKolibriBaseUrl')||'').trim(),
      sameLocalNetwork:data.get('sameLocalNetwork')==='on',
      realLearnerData:data.get('realLearnerData')==='on'
    });
    const box=document.getElementById('kolibriPilotResult');
    if(check.ready){
      box.innerHTML='<strong>PILOT READY</strong><p>LOCAL mode prerequisites are satisfied for a synthetic/test-data Kolibri pilot. Paid hosting required: NO • Internet required for the local learning session: NO.</p>';
    }else{
      box.innerHTML='<strong>PILOT NOT READY</strong><p>'+check.blockers.map(escapeHtml).join('<br>')+'</p><p class="helper">No connection was attempted and no learner data was moved.</p>';
    }
  });
}
