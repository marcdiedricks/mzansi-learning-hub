globalThis.MzansiLMSCore = (() => {
  const LEARNER_KEY = 'lms-local-learner-v0.1';
  const ENROLMENTS_KEY = 'lms-enrolments-v0.1';
  const registry = new Map();
  const configs = new Map();

  function text(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function validateRegistryEntry(entry) {
    const errors = [];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return { valid: false, errors: ['Programme registry entry must be an object.'] };
    ['programmeId','name','category','status','pwaUrl','schemaVersion'].forEach(key => {
      if (!text(entry[key])) errors.push(`${key} is required.`);
    });
    if (entry.schemaVersion && entry.schemaVersion !== 'UMLA-LR-0.1') errors.push('Unsupported learning-record schema.');
    if (entry.qualificationId != null && !text(entry.qualificationId)) errors.push('qualificationId must be a non-empty string when supplied.');
    return { valid: errors.length === 0, errors };
  }

  function validateProgrammeConfig(config, entry) {
    const errors = [];
    if (!config || typeof config !== 'object' || Array.isArray(config)) return { valid: false, errors: ['Programme config must be an object.'] };
    if (config.schemaVersion !== 'UMLA-PROGRAMME-0.1') errors.push('schemaVersion must be UMLA-PROGRAMME-0.1.');
    if (!text(config.programmeId)) errors.push('programmeId is required.');
    if (!text(config.programmeName)) errors.push('programmeName is required.');
    if (!['PARTIAL','COMPLETE'].includes(config.definitionStatus)) errors.push('definitionStatus must be PARTIAL or COMPLETE.');
    if (entry) {
      if (config.programmeId !== entry.programmeId) errors.push('programmeId does not match registry.');
      if (entry.qualificationId && config.qualificationId !== entry.qualificationId) errors.push('qualificationId does not match registry.');
    }
    if (!Array.isArray(config.stages) || !config.stages.length) errors.push('At least one stage is required.');

    const ids = new Set();
    (config.stages || []).forEach((stage, stageIndex) => {
      if (!text(stage.stageId)) errors.push(`Stage ${stageIndex + 1}: stageId is required.`);
      else if (ids.has(`stage:${stage.stageId}`)) errors.push(`Duplicate stageId: ${stage.stageId}.`);
      else ids.add(`stage:${stage.stageId}`);
      if (!text(stage.stageName)) errors.push(`Stage ${stageIndex + 1}: stageName is required.`);
      if (!Array.isArray(stage.modules)) errors.push(`Stage ${stage.stageId || stageIndex + 1}: modules must be an array.`);
      (stage.modules || []).forEach((module, moduleIndex) => {
        if (!text(module.moduleId)) errors.push(`Module ${moduleIndex + 1}: moduleId is required.`);
        else if (ids.has(`module:${module.moduleId}`)) errors.push(`Duplicate moduleId: ${module.moduleId}.`);
        else ids.add(`module:${module.moduleId}`);
        if (!text(module.moduleName)) errors.push(`Module ${module.moduleId || moduleIndex + 1}: moduleName is required.`);
        if (typeof module.definitionComplete !== 'boolean') errors.push(`Module ${module.moduleId || moduleIndex + 1}: definitionComplete must be boolean.`);
        if (!Array.isArray(module.activities)) errors.push(`Module ${module.moduleId || moduleIndex + 1}: activities must be an array.`);
        if (module.definitionComplete === true && module.required !== false && Array.isArray(module.activities) && module.activities.length === 0) {
          errors.push(`Module ${module.moduleId}: a required complete definition cannot have zero activities.`);
        }
        (module.activities || []).forEach((activity, activityIndex) => {
          if (!text(activity.activityId)) errors.push(`Activity ${activityIndex + 1} in ${module.moduleId || 'module'}: activityId is required.`);
          else if (ids.has(`activity:${activity.activityId}`)) errors.push(`Duplicate activityId: ${activity.activityId}.`);
          else ids.add(`activity:${activity.activityId}`);
          if (!text(activity.activityName)) errors.push(`Activity ${activity.activityId || activityIndex + 1}: activityName is required.`);
          if (!text(activity.activityType)) errors.push(`Activity ${activity.activityId || activityIndex + 1}: activityType is required.`);
          if (activity.satisfiedBy != null && (!Array.isArray(activity.satisfiedBy) || !activity.satisfiedBy.length || activity.satisfiedBy.some(value => !text(value)))) {
            errors.push(`Activity ${activity.activityId || activityIndex + 1}: satisfiedBy must contain valid outcomes.`);
          }
        });
      });
    });

    return { valid: errors.length === 0, errors };
  }

  function configure(programmes, programmeConfigs) {
    registry.clear();
    configs.clear();
    const errors = [];
    (Array.isArray(programmes) ? programmes : []).forEach(entry => {
      const check = validateRegistryEntry(entry);
      if (!check.valid) {
        errors.push(...check.errors.map(error => `${entry?.programmeId || 'programme'}: ${error}`));
        return;
      }
      if (registry.has(entry.programmeId)) {
        errors.push(`${entry.programmeId}: duplicate programmeId.`);
        return;
      }
      registry.set(entry.programmeId, entry);
    });
    if (programmeConfigs instanceof Map) {
      programmeConfigs.forEach((config, programmeId) => {
        const entry = registry.get(programmeId);
        const check = validateProgrammeConfig(config, entry);
        if (!check.valid) errors.push(...check.errors.map(error => `${programmeId}: ${error}`));
        else configs.set(programmeId, config);
      });
    }
    return { valid: errors.length === 0, errors };
  }

  function createId() {
    if (globalThis.crypto?.randomUUID) return `learner-${crypto.randomUUID()}`;
    return `learner-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function getOrCreateLearner() {
    let learner = await MzansiHubStore.get(LEARNER_KEY);
    if (learner?.learnerId) {
      if (!Array.isArray(learner.sourceIdentities)) learner.sourceIdentities = [];
      return learner;
    }
    const now = new Date().toISOString();
    learner = { schemaVersion: 'UMLA-LEARNER-0.1', learnerId: createId(), createdAt: now, updatedAt: now, identityMode: 'LOCAL_DEVICE', sourceIdentities: [] };
    await MzansiHubStore.set(LEARNER_KEY, learner);
    return learner;
  }

  async function linkSourceLearner(programmeId, sourceLearnerId) {
    if (!registry.has(programmeId)) throw new Error('Programme is not registered.');
    if (!text(sourceLearnerId)) throw new Error('Source learnerId is required.');
    const learner = await getOrCreateLearner();
    const identities = Array.isArray(learner.sourceIdentities) ? learner.sourceIdentities : [];
    const existingForProgramme = identities.find(item => item.programmeId === programmeId);
    if (existingForProgramme && existingForProgramme.sourceLearnerId !== sourceLearnerId) {
      throw new Error('A different source learner is already linked to this programme on this device.');
    }
    if (!existingForProgramme) {
      identities.push({ programmeId, sourceLearnerId, linkedAt: new Date().toISOString() });
      learner.sourceIdentities = identities;
      learner.updatedAt = new Date().toISOString();
      await MzansiHubStore.set(LEARNER_KEY, learner);
    }
    return learner;
  }

  function recordBelongsToLearner(record, learner) {
    if (!record || !learner) return false;
    if (record.learnerId === learner.learnerId) return true;
    return (learner.sourceIdentities || []).some(item => item.programmeId === record.programmeId && item.sourceLearnerId === record.learnerId);
  }

  async function enrol(programmeId) {
    if (!registry.has(programmeId)) throw new Error('Programme is not registered.');
    const learner = await getOrCreateLearner();
    const existing = (await MzansiHubStore.get(ENROLMENTS_KEY)) || [];
    const found = existing.find(item => item.learnerId === learner.learnerId && item.programmeId === programmeId);
    if (found) return found;
    const now = new Date().toISOString();
    const enrolment = { schemaVersion: 'UMLA-ENROLMENT-0.1', enrolmentId: `${learner.learnerId}::${programmeId}`, learnerId: learner.learnerId, programmeId, status: 'ACTIVE', enrolledAt: now, updatedAt: now };
    existing.push(enrolment);
    await MzansiHubStore.set(ENROLMENTS_KEY, existing);
    return enrolment;
  }

  async function listEnrolments() {
    return (await MzansiHubStore.get(ENROLMENTS_KEY)) || [];
  }

  function report(programmeId, events) {
    const programme = registry.get(programmeId);
    if (!programme) throw new Error('Programme is not registered.');
    const records = (Array.isArray(events) ? events : []).filter(event => event?.programmeId === programmeId);
    const sorted = [...records].sort((a,b) => String(a.occurredAt || '').localeCompare(String(b.occurredAt || '')));
    const latest = sorted.length ? sorted[sorted.length - 1] : null;
    const config = configs.get(programmeId);
    const progress = config && globalThis.MzansiProgressEngine ? MzansiProgressEngine.calculate(config, records) : null;
    return {
      schemaVersion: 'UMLA-REPORT-0.1',
      programmeId,
      programmeName: programme.name,
      recordCount: records.length,
      lastActivityAt: latest?.occurredAt || null,
      lastModuleId: latest?.moduleId || null,
      lastActivityId: latest?.activityId || null,
      pathwayStatus: progress?.status || 'PATHWAY_NOT_CONFIGURED',
      percent: progress?.percent ?? null,
      definitionComplete: progress?.definitionComplete ?? false,
      nextRequired: progress?.nextRequired || null,
      warning: progress?.warning || (config ? null : 'Programme pathway is not configured; programme progress is withheld.')
    };
  }

  return { validateRegistryEntry, validateProgrammeConfig, configure, getOrCreateLearner, linkSourceLearner, recordBelongsToLearner, enrol, listEnrolments, report };
})();
