globalThis.MzansiProgrammePackageManager = (() => {
  const DRAFT_KEY = 'programme-package-draft-v0.1';
  const REGISTERED_KEY = 'programme-packages-registered-v0.1';

  function text(value){ return typeof value === 'string' && value.trim().length > 0; }

  function normaliseId(value){
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }

  function buildPackage(form){
    const data=new FormData(form);
    return {
      packageVersion:'MLH-PACKAGE-0.1',
      programmeId:normaliseId(data.get('programmeId')),
      programmeName:String(data.get('programmeName')||'').trim(),
      shortDescription:String(data.get('shortDescription')||'').trim(),
      category:String(data.get('category')||'').trim(),
      tradeOrField:String(data.get('tradeOrField')||'').trim(),
      qualification:{
        qualificationId:String(data.get('qualificationId')||'').trim(),
        qualificationName:'',
        nqfLevel:data.get('nqfLevel')?Number(data.get('nqfLevel')):null,
        credits:null
      },
      status:String(data.get('status')||'DRAFT').trim(),
      ownership:{organisationName:'',contactName:'',contactEmail:''},
      pwa:{
        launchUrl:String(data.get('launchUrl')||'').trim(),
        offlineCapable:data.get('offlineCapable')==='on',
        installable:data.get('installable')==='on',
        umlaCompatible:data.get('umlaCompatible')==='on',
        umlaSchemaVersion:data.get('umlaCompatible')==='on'?'UMLA-LR-0.1':''
      },
      learningStructure:{definitionStatus:'PARTIAL',programmeConfig:''},
      registration:{approved:false,approvedAt:null}
    };
  }

  function validate(pkg){
    const errors=[];
    if(pkg.packageVersion!=='MLH-PACKAGE-0.1') errors.push('Unsupported package version.');
    ['programmeId','programmeName','shortDescription','category','tradeOrField'].forEach(key=>{if(!text(pkg[key])) errors.push(key+' is required.');});
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.programmeId||'')) errors.push('Programme ID must use simple lowercase words separated by hyphens.');
    try{ new URL(pkg.pwa.launchUrl); }catch{ errors.push('A valid PWA launch URL is required.'); }
    if(pkg.qualification.nqfLevel!=null && (!Number.isInteger(pkg.qualification.nqfLevel)||pkg.qualification.nqfLevel<1||pkg.qualification.nqfLevel>10)) errors.push('NQF level must be between 1 and 10.');
    return {valid:errors.length===0,errors};
  }

  async function saveDraft(pkg){ await MzansiHubStore.set(DRAFT_KEY,pkg); }
  async function loadDraft(){ return await MzansiHubStore.get(DRAFT_KEY); }

  async function listRegistered(){
    const items=await MzansiHubStore.get(REGISTERED_KEY);
    return Array.isArray(items)?items:[];
  }

  function toRegistryEntry(pkg){
    return {
      programmeId:pkg.programmeId,
      name:pkg.programmeName,
      category:pkg.category,
      qualificationId:pkg.qualification?.qualificationId||undefined,
      status:String(pkg.status||'DRAFT').toLowerCase(),
      pwaUrl:pkg.pwa.launchUrl,
      schemaVersion:pkg.pwa.umlaCompatible?'UMLA-LR-0.1':'UMLA-LR-0.1',
      localPackage:true
    };
  }

  async function removeRegistered(programmeId){
    const items=await listRegistered();
    const next=items.filter(item=>item.programmeId!==programmeId);
    if(next.length===items.length) return {removed:false};
    await MzansiHubStore.set(REGISTERED_KEY,next);
    return {removed:true};
  }

  async function updateRegistered(originalProgrammeId,pkg){
    const check=validate(pkg);
    if(!check.valid) return {updated:false,errors:check.errors};
    if(pkg.programmeId!==originalProgrammeId){
      return {updated:false,errors:['Programme ID is the permanent identity and cannot be changed during an update.']};
    }
    const items=await listRegistered();
    const index=items.findIndex(item=>item.programmeId===originalProgrammeId);
    if(index<0) return {updated:false,errors:['Registered package could not be found.']};
    const existing=items[index];
    items[index]={
      ...pkg,
      registration:{
        approved:true,
        approvedAt:existing.registration?.approvedAt||new Date().toISOString(),
        updatedAt:new Date().toISOString()
      }
    };
    await MzansiHubStore.set(REGISTERED_KEY,items);
    return {updated:true,package:items[index]};
  }

  async function register(pkg){
    const check=validate(pkg);
    if(!check.valid) return {registered:false,errors:check.errors};
    if(globalThis.MzansiLearningHub?.hasProgrammeId(pkg.programmeId)){
      return {registered:false,errors:['That Programme ID is already registered in the Hub.']};
    }
    const items=await listRegistered();
    if(items.some(item=>item.programmeId===pkg.programmeId)){
      return {registered:false,errors:['That Programme ID is already registered locally.']};
    }
    const approved={
      ...pkg,
      registration:{approved:true,approvedAt:new Date().toISOString()}
    };
    items.push(approved);
    await MzansiHubStore.set(REGISTERED_KEY,items);
    return {registered:true,package:approved};
  }

  return {buildPackage,validate,saveDraft,loadDraft,listRegistered,toRegistryEntry,register,removeRegistered,updateRegistered};
})();

(function(){
  const form=document.getElementById('programmePackageForm');
  const preview=document.getElementById('packagePreview');
  const saveBtn=document.getElementById('savePackageDraftBtn');
  const registeredList=document.getElementById('registeredPackageList');
  if(!form||!preview||!saveBtn||!registeredList) return;

  function esc(value){
    return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  let editingProgrammeId=null;

  function fillForm(pkg){
    const set=(name,value)=>{const field=form.elements.namedItem(name);if(field) field.value=value??'';};
    set('programmeName',pkg.programmeName);
    set('programmeId',pkg.programmeId);
    set('tradeOrField',pkg.tradeOrField);
    set('category',pkg.category);
    set('shortDescription',pkg.shortDescription);
    set('qualificationId',pkg.qualification?.qualificationId);
    set('nqfLevel',pkg.qualification?.nqfLevel);
    set('launchUrl',pkg.pwa?.launchUrl);
    set('status',pkg.status);
    ['offlineCapable','installable','umlaCompatible'].forEach(name=>{const field=form.elements.namedItem(name);if(field) field.checked=Boolean(pkg.pwa?.[name]);});
  }

  function enterEditMode(pkg){
    editingProgrammeId=pkg.programmeId;
    fillForm(pkg);
    const idField=form.elements.namedItem('programmeId');
    if(idField) idField.disabled=true;
    preview.innerHTML='<article class="programme-card"><p class="eyebrow">EDITING REGISTERED PACKAGE</p><h3>'+esc(pkg.programmeName)+'</h3><p class="helper">Update the fields above, then tap Validate and preview. Programme ID is locked to protect the package identity.</p><button id="cancelPackageEditBtn" class="secondary-btn" type="button">Cancel edit</button></article>';
    document.getElementById('cancelPackageEditBtn').addEventListener('click',exitEditMode);
    document.getElementById('packageView').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function exitEditMode(){
    editingProgrammeId=null;
    const idField=form.elements.namedItem('programmeId');
    if(idField) idField.disabled=false;
    form.reset();
    preview.innerHTML='<p class="helper">Complete the form to preview the standalone programme package.</p>';
  }

  async function renderRegistered(){
    const items=await MzansiProgrammePackageManager.listRegistered();
    if(!items.length){
      registeredList.innerHTML='<p class="helper">No standalone PWAs have been registered locally yet.</p>';
      return;
    }
    registeredList.innerHTML=items.map(pkg=>'<article class="package-manage-card" data-package-id="'+esc(pkg.programmeId)+'"><div><p class="eyebrow">'+esc(pkg.category).toUpperCase()+' • '+esc(pkg.status)+'</p><h4>'+esc(pkg.programmeName)+'</h4><p class="programme-meta">'+esc(pkg.tradeOrField)+(pkg.qualification?.qualificationId?' • '+esc(pkg.qualification.qualificationId):'')+'</p></div><div class="package-actions"><button class="secondary-btn" type="button" data-edit-package="'+esc(pkg.programmeId)+'">Edit package</button><button class="secondary-btn" type="button" data-inspect-package="'+esc(pkg.programmeId)+'">View details</button><button class="danger-btn" type="button" data-remove-package="'+esc(pkg.programmeId)+'">Remove from Hub</button></div><div class="package-detail" id="detail-'+esc(pkg.programmeId)+'" hidden></div></article>').join('');

    registeredList.querySelectorAll('[data-edit-package]').forEach(button=>button.addEventListener('click',()=>{
      const pkg=items.find(item=>item.programmeId===button.dataset.editPackage);
      if(pkg) enterEditMode(pkg);
    }));

    registeredList.querySelectorAll('[data-inspect-package]').forEach(button=>button.addEventListener('click',()=>{
      const pkg=items.find(item=>item.programmeId===button.dataset.inspectPackage);
      if(!pkg) return;
      const detail=document.getElementById('detail-'+pkg.programmeId);
      const show=detail.hidden;
      detail.hidden=!show;
      button.textContent=show?'Hide details':'View details';
      if(show){
        detail.innerHTML='<p><strong>Programme ID:</strong> '+esc(pkg.programmeId)+'</p><p><strong>Description:</strong> '+esc(pkg.shortDescription)+'</p><p><strong>PWA:</strong> '+esc(pkg.pwa?.launchUrl)+'</p><p><strong>Offline:</strong> '+(pkg.pwa?.offlineCapable?'Yes':'Not confirmed')+'</p><p><strong>Installable:</strong> '+(pkg.pwa?.installable?'Yes':'Not confirmed')+'</p><p><strong>UMLA:</strong> '+(pkg.pwa?.umlaCompatible?'Yes':'Not confirmed')+'</p><p><strong>Registered:</strong> '+esc(pkg.registration?.approvedAt||'Unknown')+'</p>';
      }
    }));

    registeredList.querySelectorAll('[data-remove-package]').forEach(button=>button.addEventListener('click',async()=>{
      const programmeId=button.dataset.removePackage;
      const pkg=items.find(item=>item.programmeId===programmeId);
      if(!pkg) return;
      if(button.dataset.confirm!=='yes'){
        button.dataset.confirm='yes';
        button.textContent='Tap again to confirm removal';
        return;
      }
      const result=await MzansiProgrammePackageManager.removeRegistered(programmeId);
      if(result.removed){
        await renderRegistered();
        dispatchEvent(new CustomEvent('mzansi:programmes-changed'));
      }
    }));
  }

  function render(pkg,check){
    if(!check.valid){
      preview.innerHTML='<strong>NOT READY</strong><p class="helper">'+check.errors.join(' ')+'</p>';
      return;
    }
    const actionLabel=editingProgrammeId?'Save package update':'Approve and register locally';
    preview.innerHTML='<article class="programme-card"><p class="eyebrow">'+pkg.category.toUpperCase()+' • '+pkg.status+'</p><h3>'+esc(pkg.programmeName)+'</h3><p class="programme-meta">'+esc(pkg.tradeOrField)+(pkg.qualification.qualificationId?' • '+esc(pkg.qualification.qualificationId):'')+'</p><p>'+esc(pkg.shortDescription)+'</p><p class="helper">Standalone PWA • '+(pkg.pwa.offlineCapable?'offline capable':'offline not confirmed')+' • '+(pkg.pwa.umlaCompatible?'UMLA compatible':'UMLA not confirmed')+'</p><p class="helper">'+(editingProgrammeId?'Validated update. The package identity remains unchanged.':'Preview validated. Registration keeps this PWA separate and does not alter the Hub core.')+'</p><button id="registerPackageBtn" class="primary-btn" type="button">'+actionLabel+'</button></article>';
    document.getElementById('registerPackageBtn').addEventListener('click',async()=>{
      if(editingProgrammeId){
        const result=await MzansiProgrammePackageManager.updateRegistered(editingProgrammeId,pkg);
        if(!result.updated){
          preview.insertAdjacentHTML('beforeend','<p class="helper"><strong>UPDATE BLOCKED:</strong> '+result.errors.join(' ')+'</p>');
          return;
        }
        preview.innerHTML='<article class="programme-card"><p class="eyebrow">PACKAGE UPDATED</p><h3>'+esc(pkg.programmeName)+'</h3><p class="helper">The registered package was updated locally. The standalone PWA and Hub core were not changed.</p></article>';
        editingProgrammeId=null;
        const idField=form.elements.namedItem('programmeId');
        if(idField) idField.disabled=false;
        await renderRegistered();
        dispatchEvent(new CustomEvent('mzansi:programmes-changed'));
        return;
      }
      const result=await MzansiProgrammePackageManager.register(pkg);
      if(!result.registered){
        preview.insertAdjacentHTML('beforeend','<p class="helper"><strong>REGISTRATION BLOCKED:</strong> '+result.errors.join(' ')+'</p>');
        return;
      }
      preview.innerHTML='<article class="programme-card"><p class="eyebrow">REGISTERED LOCALLY</p><h3>'+esc(pkg.programmeName)+'</h3><p class="helper">This standalone PWA is now in the local Hub registry. No Hub core code was changed.</p></article>';
      await renderRegistered();
      dispatchEvent(new CustomEvent('mzansi:programmes-changed'));
    });
  }

  form.addEventListener('submit',event=>{
    event.preventDefault();
    const idField=form.elements.namedItem('programmeId');
    const restoreDisabled=Boolean(idField?.disabled);
    if(restoreDisabled) idField.disabled=false;
    const pkg=MzansiProgrammePackageManager.buildPackage(form);
    if(restoreDisabled) idField.disabled=true;
    render(pkg,MzansiProgrammePackageManager.validate(pkg));
  });

  saveBtn.addEventListener('click',async()=>{
    const pkg=MzansiProgrammePackageManager.buildPackage(form);
    const check=MzansiProgrammePackageManager.validate(pkg);
    render(pkg,check);
    if(!check.valid) return;
    await MzansiProgrammePackageManager.saveDraft(pkg);
    saveBtn.textContent='Draft saved locally';
  });

  renderRegistered().catch(()=>{registeredList.innerHTML='<p class="helper">Local package list could not be loaded.</p>';});

  MzansiProgrammePackageManager.loadDraft().then(pkg=>{
    if(!pkg) return;
    const set=(name,value)=>{const field=form.elements.namedItem(name);if(field) field.value=value??'';};
    set('programmeName',pkg.programmeName);
    set('programmeId',pkg.programmeId);
    set('tradeOrField',pkg.tradeOrField);
    set('category',pkg.category);
    set('shortDescription',pkg.shortDescription);
    set('qualificationId',pkg.qualification?.qualificationId);
    set('nqfLevel',pkg.qualification?.nqfLevel);
    set('launchUrl',pkg.pwa?.launchUrl);
    set('status',pkg.status);
    ['offlineCapable','installable','umlaCompatible'].forEach(name=>{const field=form.elements.namedItem(name);if(field) field.checked=Boolean(pkg.pwa?.[name]);});
  }).catch(()=>{});
})();
