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

  return {buildPackage,validate,saveDraft,loadDraft,listRegistered,toRegistryEntry,register};
})();

(function(){
  const form=document.getElementById('programmePackageForm');
  const preview=document.getElementById('packagePreview');
  const saveBtn=document.getElementById('savePackageDraftBtn');
  if(!form||!preview||!saveBtn) return;

  function render(pkg,check){
    if(!check.valid){
      preview.innerHTML='<strong>NOT READY</strong><p class="helper">'+check.errors.join(' ')+'</p>';
      return;
    }
    preview.innerHTML='<article class="programme-card"><p class="eyebrow">'+pkg.category.toUpperCase()+' • '+pkg.status+'</p><h3>'+pkg.programmeName+'</h3><p class="programme-meta">'+pkg.tradeOrField+(pkg.qualification.qualificationId?' • '+pkg.qualification.qualificationId:'')+'</p><p>'+pkg.shortDescription+'</p><p class="helper">Standalone PWA • '+(pkg.pwa.offlineCapable?'offline capable':'offline not confirmed')+' • '+(pkg.pwa.umlaCompatible?'UMLA compatible':'UMLA not confirmed')+'</p><p class="helper">Preview validated. Registration keeps this PWA separate and does not alter the Hub core.</p><button id="registerPackageBtn" class="primary-btn" type="button">Approve and register locally</button></article>';
    document.getElementById('registerPackageBtn').addEventListener('click',async()=>{
      const result=await MzansiProgrammePackageManager.register(pkg);
      if(!result.registered){
        preview.insertAdjacentHTML('beforeend','<p class="helper"><strong>REGISTRATION BLOCKED:</strong> '+result.errors.join(' ')+'</p>');
        return;
      }
      preview.innerHTML='<article class="programme-card"><p class="eyebrow">REGISTERED LOCALLY</p><h3>'+pkg.programmeName+'</h3><p class="helper">This standalone PWA is now in the local Hub registry. No Hub core code was changed.</p></article>';
      dispatchEvent(new CustomEvent('mzansi:programmes-changed'));
    });
  }

  form.addEventListener('submit',event=>{
    event.preventDefault();
    const pkg=MzansiProgrammePackageManager.buildPackage(form);
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
