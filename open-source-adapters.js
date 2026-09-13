globalThis.MzansiOpenSourceAdapters = (() => {
  function kolibri() {
    const provider = MzansiOpenSourceBridge.provider('KOLIBRI');
    return MzansiAdapterContract.createReadOnlyStub(provider, {
      localNode: true,
      offlineLocalNetwork: true,
      learnerAccounts: true,
      coachAdminRoles: true,
      courseContent: true,
      assessments: true,
      umlaTranslationPlanned: true
    });
  }

  function moodle() {
    const provider = MzansiOpenSourceBridge.provider('MOODLE');
    return MzansiAdapterContract.createReadOnlyStub(provider, {
      institutionalServer: true,
      learnerAccounts: true,
      roleManagement: true,
      courseAdministration: true,
      grading: true,
      webServices: true,
      umlaTranslationPlanned: true
    });
  }

  function validateAll() {
    const providers = { KOLIBRI: kolibri(), MOODLE: moodle() };
    const results = {};
    let valid = true;

    Object.entries(providers).forEach(([key, adapter]) => {
      const report = MzansiAdapterContract.capabilityReport(adapter);
      results[key] = report;
      if (!report.valid) valid = false;
    });

    return { valid, results };
  }

  async function selfTest() {
    const adapters = { KOLIBRI: kolibri(), MOODLE: moodle() };
    const results = {};
    let valid = true;

    for (const [key, adapter] of Object.entries(adapters)) {
      const runtime = await MzansiAdapterContract.runtimeCheck(adapter);
      const providerMatches = runtime.valid && runtime.provider?.providerId === key;
      const safeStub = runtime.valid &&
        runtime.status?.connected === false &&
        runtime.status?.authenticated === false &&
        runtime.status?.syncEnabled === false &&
        runtime.health?.simulated === true &&
        runtime.health?.networkUsed === false;

      results[key] = {
        ...runtime,
        providerMatches,
        safeStub
      };

      if (!runtime.valid || !providerMatches || !safeStub) valid = false;
    }

    return { valid, results };
  }

  return { kolibri, moodle, validateAll, selfTest };
})();
