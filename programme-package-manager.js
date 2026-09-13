globalThis.MzansiProgrammePackageManager = (() => {
  const DRAFT_KEY = 'programme-package-draft-v0.1';

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

  return {buildPackage,validate,saveDraft,loadDraft};
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
    preview.innerHTML='<article class="programme-card"><p class="eyebrow">'+pkg.category.toUpperCase()+' • '+pkg.status+'</p><h3>'+pkg.programmeName+'</h3><p class="programme-meta">'+pkg.tradeOrField+(pkg.qualification.qualificationId?' • '+pkg.qualification.qualificationId:'')+'</p><p>'+pkg.shortDescription+'</p><p class="helper">Standalone PWA • '+(pkg.pwa.offlineCapable?'offline capable':'offline not confirmed')+' • '+(pkg.pwa.umlaCompatible?'UMLA compatible':'UMLA not confirmed')+'</p><p class="helper">This is a preview only. It is not yet registered in the Hub.</p></article>';
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
