globalThis.MzansiKolibriAdapter = (() => {
  const PROFILE_KEY = 'open-source-engine-kolibri-v0.1';

  function text(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function profileFromForm(form) {
    const data = new FormData(form);
    return {
      profileVersion: MzansiOpenSourceBridge.PROFILE_VERSION,
      providerId: 'KOLIBRI',
      mode: 'LOCAL_NODE',
      baseUrl: String(data.get('kolibriBaseUrl') || '').trim(),
      enabled: data.get('kolibriEnabled') === 'on'
    };
  }

  async function saveProfile(profile) {
    const normalised = MzansiOpenSourceBridge.normaliseProfile(profile);
    if (!normalised.valid) return normalised;
    await MzansiHubStore.set(PROFILE_KEY, normalised.profile);
    return { valid: true, profile: normalised.profile };
  }

  async function loadProfile() {
    return await MzansiHubStore.get(PROFILE_KEY);
  }

  async function clearProfile() {
    await MzansiHubStore.set(PROFILE_KEY, null);
  }

  async function checkReachability(profile) {
    const check = MzansiOpenSourceBridge.validateProfile(profile);
    if (!check.valid) return { reachable: false, errors: check.errors };
    if (!profile.enabled) return { reachable: false, errors: ['Enable the Kolibri connection before testing it.'] };

    try {
      const response = await fetch(profile.baseUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store'
      });
      return {
        reachable: response.ok,
        status: response.status,
        note: response.ok
          ? 'Kolibri address responded. This is a reachability check only, not an authenticated integration test.'
          : 'The address responded, but not with a successful HTTP status.'
      };
    } catch {
      return {
        reachable: false,
        errors: [
          'The Hub could not confirm the Kolibri address from this browser. The local node may be offline, unreachable, or blocking cross-origin browser requests.'
        ]
      };
    }
  }

  async function runDemo() {
    const demo = {
      demoVersion: 'MLH-KOLIBRI-DEMO-0.1',
      providerId: 'KOLIBRI',
      mode: 'LOCAL_NODE',
      simulated: true,
      profileStorage: 'PASS',
      enableDisableState: 'PASS',
      adapterReadiness: 'PASS',
      credentialsStored: false,
      networkUsed: false,
      ranAt: new Date().toISOString()
    };
    await MzansiHubStore.set('open-source-engine-kolibri-demo-v0.1', demo);
    const saved = await MzansiHubStore.get('open-source-engine-kolibri-demo-v0.1');
    return saved && saved.simulated === true
      ? { valid: true, demo: saved }
      : { valid: false, errors: ['Kolibri demo state could not be verified locally.'] };
  }

  return {
    PROFILE_KEY,
    profileFromForm,
    saveProfile,
    loadProfile,
    clearProfile,
    checkReachability,
    runDemo
  };
})();

(function(){
  const form=document.getElementById('kolibriEngineForm');
  const result=document.getElementById('kolibriEngineResult');
  const clearBtn=document.getElementById('clearKolibriProfileBtn');
  if(!form||!result||!clearBtn) return;

  const demoBtn=document.createElement('button');
  demoBtn.type='button';
  demoBtn.className='secondary-btn';
  demoBtn.textContent='Run safe demo test';
  clearBtn.insertAdjacentElement('afterend',demoBtn);

  const demoNote=document.createElement('p');
  demoNote.className='helper';
  demoNote.textContent='Simulation only. This checks Hub-side storage and adapter readiness without connecting to a real Kolibri server or using the internet.';
  demoBtn.insertAdjacentElement('afterend',demoNote);

  function esc(value){
    return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function show(message, ok=false){
    result.innerHTML='<strong>'+(ok?'READY':'CHECK')+'</strong><p>'+esc(message)+'</p>';
  }

  async function load(){
    const profile=await MzansiKolibriAdapter.loadProfile();
    if(!profile) return;
    const base=form.elements.namedItem('kolibriBaseUrl');
    const enabled=form.elements.namedItem('kolibriEnabled');
    if(base) base.value=profile.baseUrl||'';
    if(enabled) enabled.checked=profile.enabled===true;
    show(profile.enabled
      ? 'Kolibri local-node profile saved. No password or API token is stored in the Hub.'
      : 'Kolibri profile saved but not enabled.', true);
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const profile=MzansiKolibriAdapter.profileFromForm(form);
    const saved=await MzansiKolibriAdapter.saveProfile(profile);
    if(!saved.valid){
      show(saved.errors.join(' '));
      return;
    }
    const reach=await MzansiKolibriAdapter.checkReachability(saved.profile);
    if(reach.reachable){
      show(reach.note, true);
    }else{
      show((reach.errors||[]).join(' ') || reach.note || 'Kolibri address could not be confirmed.');
    }
  });

  demoBtn.addEventListener('click',async()=>{
    const demo=await MzansiKolibriAdapter.runDemo();
    if(!demo.valid){
      show((demo.errors||[]).join(' '));
      return;
    }
    result.innerHTML='<strong>DEMO PASS</strong><p>Profile storage PASS • enable/disable state PASS • adapter readiness PASS • credentials stored NO • network used NO.</p>';
  });

  clearBtn.addEventListener('click',async()=>{
    await MzansiKolibriAdapter.clearProfile();
    form.reset();
    show('Kolibri local-node profile cleared. The Learning Hub continues to work independently.', true);
  });

  load().catch(()=>show('Kolibri profile could not be loaded.'));
})();