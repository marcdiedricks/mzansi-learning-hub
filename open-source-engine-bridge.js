globalThis.MzansiOpenSourceBridge = (() => {
  const PROFILE_VERSION = 'MLH-ENGINE-0.1';

  const PROVIDERS = Object.freeze({
    KOLIBRI: Object.freeze({
      providerId: 'KOLIBRI',
      label: 'Kolibri',
      openSource: true,
      preferredMode: 'LOCAL_NODE',
      costProfile: 'SELF_HOSTED_FREE_SOFTWARE',
      capabilities: Object.freeze({
        offlineLocalNetwork: true,
        learnerAccounts: true,
        coachAdminRoles: true,
        courseContent: true,
        assessments: true,
        internetRequiredForCoreUse: false
      })
    }),
    MOODLE: Object.freeze({
      providerId: 'MOODLE',
      label: 'Moodle',
      openSource: true,
      preferredMode: 'INSTITUTIONAL_SERVER',
      costProfile: 'SELF_HOSTED_FREE_SOFTWARE',
      capabilities: Object.freeze({
        offlineLocalNetwork: false,
        learnerAccounts: true,
        coachAdminRoles: true,
        courseContent: true,
        assessments: true,
        webServices: true,
        internetRequiredForCoreUse: true
      })
    })
  });

  function text(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function provider(providerId) {
    return PROVIDERS[providerId] || null;
  }

  function validateProfile(profile) {
    const errors = [];
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
      return { valid: false, errors: ['Engine profile must be an object.'] };
    }
    if (profile.profileVersion !== PROFILE_VERSION) errors.push('Unsupported engine profile version.');
    if (!provider(profile.providerId)) errors.push('Unsupported open-source engine provider.');
    if (!['LOCAL_NODE','INSTITUTIONAL_SERVER'].includes(profile.mode)) errors.push('mode must be LOCAL_NODE or INSTITUTIONAL_SERVER.');
    if (profile.baseUrl != null && !text(profile.baseUrl)) errors.push('baseUrl must be a non-empty string when supplied.');
    if (profile.enabled === true && !text(profile.baseUrl)) errors.push('baseUrl is required before an engine connection can be enabled.');

    try {
      if (text(profile.baseUrl)) {
        const url = new URL(profile.baseUrl);
        if (!['http:','https:'].includes(url.protocol)) errors.push('baseUrl must use HTTP or HTTPS.');
      }
    } catch {
      errors.push('baseUrl must be a valid URL.');
    }

    return { valid: errors.length === 0, errors };
  }

  function normaliseProfile(profile) {
    const check = validateProfile(profile);
    if (!check.valid) return { valid: false, errors: check.errors };
    return {
      valid: true,
      profile: {
        profileVersion: PROFILE_VERSION,
        providerId: profile.providerId,
        mode: profile.mode,
        baseUrl: profile.baseUrl || '',
        enabled: profile.enabled === true,
        syncEnabled: false,
        credentialsStoredInHub: false
      }
    };
  }

  return {
    PROFILE_VERSION,
    PROVIDERS,
    provider,
    validateProfile,
    normaliseProfile
  };
})();
