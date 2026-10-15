globalThis.MzansiDeploymentModes = (() => {
  const MODE_VERSION = 'MLH-MODE-0.1';

  const MODES = Object.freeze({
    INDIVIDUAL: Object.freeze({
      modeId: 'INDIVIDUAL',
      label: 'Individual',
      description: 'Hub and standalone learning PWAs on one learner device.',
      serverRequired: false,
      localNetworkRequired: false,
      internetRequiredForCoreUse: false,
      engines: Object.freeze([])
    }),
    LOCAL: Object.freeze({
      modeId: 'LOCAL',
      label: 'Local',
      description: 'Hub and learner devices connect to an optional open-source learning node on the same local network.',
      serverRequired: true,
      localNetworkRequired: true,
      internetRequiredForCoreUse: false,
      engines: Object.freeze(['KOLIBRI'])
    }),
    INSTITUTIONAL: Object.freeze({
      modeId: 'INSTITUTIONAL',
      label: 'Institutional',
      description: 'Hub connects through adapters to one or more institution-managed open-source servers.',
      serverRequired: true,
      localNetworkRequired: false,
      internetRequiredForCoreUse: false,
      engines: Object.freeze(['KOLIBRI','MOODLE'])
    })
  });

  function get(modeId) {
    return MODES[modeId] || null;
  }

  function validateMode(mode) {
    const errors=[];
    if(!mode || typeof mode!=='object' || Array.isArray(mode)) {
      return {valid:false,errors:['Deployment mode must be an object.']};
    }
    if(mode.modeVersion!==MODE_VERSION) errors.push('Unsupported deployment mode version.');
    if(!get(mode.modeId)) errors.push('Unsupported deployment mode.');
    return {valid:errors.length===0,errors};
  }

  function createSelection(modeId) {
    if(!get(modeId)) return {valid:false,errors:['Unsupported deployment mode.']};
    return {
      valid:true,
      selection:Object.freeze({
        modeVersion:MODE_VERSION,
        modeId,
        selectedAt:new Date().toISOString()
      })
    };
  }

  function kolibriPilotReadiness({baseUrl='',sameLocalNetwork=false,realLearnerData=false}={}) {
    const blockers=[];
    if(typeof baseUrl!=='string' || !baseUrl.trim()) blockers.push('A real Kolibri local-node address is required.');
    if(sameLocalNetwork!==true) blockers.push('The phone and Kolibri node must be on the same local network.');
    if(realLearnerData===true) blockers.push('Pilot must use synthetic/test learner data only.');

    if(baseUrl && typeof baseUrl==='string') {
      try {
        const parsed=new URL(baseUrl);
        if(!['http:','https:'].includes(parsed.protocol)) blockers.push('Kolibri address must use HTTP or HTTPS.');
      } catch {
        blockers.push('Kolibri address must be a valid URL.');
      }
    }

    return {
      ready:blockers.length===0,
      mode:'LOCAL',
      providerId:'KOLIBRI',
      blockers,
      requirements:Object.freeze({
        existingLaptopOrDesktopFirst:true,
        sameLocalNetwork:true,
        internetRequiredForLearningSession:false,
        genuineLearnerDataAllowed:false,
        paidHostingRequired:false
      })
    };
  }

  return {MODE_VERSION,MODES,get,validateMode,createSelection,kolibriPilotReadiness};
})();
