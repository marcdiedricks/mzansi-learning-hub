globalThis.MzansiAdapterContract = (() => {
  const CONTRACT_VERSION = 'MLH-ADAPTER-0.1';

  const REQUIRED_METHODS = Object.freeze([
    'getProviderInfo',
    'getStatus',
    'validateConnectionProfile',
    'listCapabilities',
    'healthCheck'
  ]);

  const OPTIONAL_METHODS = Object.freeze([
    'pullLearners',
    'pullEnrolments',
    'pullCourses',
    'pullProgress',
    'pushEnrolment',
    'pushLearningRecord',
    'pushEvidence',
    'sync'
  ]);

  function isFunction(value) {
    return typeof value === 'function';
  }

  function validateAdapter(adapter) {
    const errors = [];
    if (!adapter || typeof adapter !== 'object' || Array.isArray(adapter)) {
      return { valid: false, errors: ['Adapter must be an object.'] };
    }

    if (adapter.contractVersion !== CONTRACT_VERSION) {
      errors.push('Unsupported adapter contract version.');
    }

    REQUIRED_METHODS.forEach(method => {
      if (!isFunction(adapter[method])) errors.push(`Missing required adapter method: ${method}.`);
    });

    return { valid: errors.length === 0, errors };
  }

  function capabilityReport(adapter) {
    const check = validateAdapter(adapter);
    if (!check.valid) return { valid: false, errors: check.errors };

    const capabilities = adapter.listCapabilities();
    if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) {
      return { valid: false, errors: ['listCapabilities() must return an object.'] };
    }

    const optional = {};
    OPTIONAL_METHODS.forEach(method => {
      optional[method] = isFunction(adapter[method]);
    });

    return {
      valid: true,
      provider: adapter.getProviderInfo(),
      capabilities,
      optionalMethods: optional
    };
  }

  function createReadOnlyStub(providerInfo, capabilities = {}) {
    return Object.freeze({
      contractVersion: CONTRACT_VERSION,
      getProviderInfo() {
        return Object.freeze({ ...providerInfo });
      },
      getStatus() {
        return Object.freeze({
          configured: false,
          connected: false,
          authenticated: false,
          syncEnabled: false,
          mode: providerInfo?.preferredMode || 'UNKNOWN'
        });
      },
      validateConnectionProfile(profile) {
        return {
          valid: !!profile && typeof profile === 'object' && !Array.isArray(profile),
          errors: (!profile || typeof profile !== 'object' || Array.isArray(profile))
            ? ['Connection profile must be an object.']
            : []
        };
      },
      listCapabilities() {
        return Object.freeze({ ...capabilities });
      },
      async healthCheck() {
        return Object.freeze({
          ok: true,
          simulated: true,
          networkUsed: false,
          note: 'Contract stub only. No external service was contacted.'
        });
      }
    });
  }

  return {
    CONTRACT_VERSION,
    REQUIRED_METHODS,
    OPTIONAL_METHODS,
    validateAdapter,
    capabilityReport,
    createReadOnlyStub
  };
})();
