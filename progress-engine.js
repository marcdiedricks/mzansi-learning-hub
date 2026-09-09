globalThis.MzansiProgressEngine = (() => {
  const SATISFIED_OUTCOMES = new Set(['completed', 'passed']);

  function latestEventByActivity(events, programmeId) {
    const latest = new Map();
    (Array.isArray(events) ? events : [])
      .filter(event => event?.programmeId === programmeId)
      .forEach(event => {
        const previous = latest.get(event.activityId);
        if (!previous || String(event.occurredAt || '') >= String(previous.occurredAt || '')) {
          latest.set(event.activityId, event);
        }
      });
    return latest;
  }

  function activitySatisfied(activity, event) {
    if (!event) return false;
    const accepted = Array.isArray(activity?.satisfiedBy) && activity.satisfiedBy.length
      ? new Set(activity.satisfiedBy)
      : SATISFIED_OUTCOMES;
    return accepted.has(event.outcome);
  }

  function moduleProgress(module, eventMap) {
    const requiredActivities = (module.activities || []).filter(activity => activity.required !== false);

    if (!module.definitionComplete) {
      const knownSatisfied = requiredActivities.filter(activity => activitySatisfied(activity, eventMap.get(activity.activityId))).length;
      return {
        moduleId: module.moduleId,
        moduleName: module.moduleName,
        status: 'PARTIAL_DEFINITION',
        percent: null,
        knownRequired: requiredActivities.length,
        knownSatisfied,
        complete: false
      };
    }

    if (!requiredActivities.length) {
      return {
        moduleId: module.moduleId,
        moduleName: module.moduleName,
        status: 'NOT_STARTED',
        percent: 0,
        knownRequired: 0,
        knownSatisfied: 0,
        complete: false
      };
    }

    const satisfied = requiredActivities.filter(activity => activitySatisfied(activity, eventMap.get(activity.activityId))).length;
    const percent = Math.round((satisfied / requiredActivities.length) * 100);
    return {
      moduleId: module.moduleId,
      moduleName: module.moduleName,
      status: satisfied === 0 ? 'NOT_STARTED' : satisfied === requiredActivities.length ? 'COMPLETE' : 'IN_PROGRESS',
      percent,
      knownRequired: requiredActivities.length,
      knownSatisfied: satisfied,
      complete: satisfied === requiredActivities.length
    };
  }

  function stageProgress(stage, eventMap) {
    const modules = (stage.modules || []).filter(module => module.required !== false).map(module => moduleProgress(module, eventMap));
    const fullyDefined = modules.filter(module => module.status !== 'PARTIAL_DEFINITION');
    const definitionComplete = modules.length > 0 && fullyDefined.length === modules.length;

    if (!definitionComplete) {
      return {
        stageId: stage.stageId,
        stageName: stage.stageName,
        status: 'PARTIAL_DEFINITION',
        percent: null,
        modules,
        complete: false
      };
    }

    const completeModules = modules.filter(module => module.complete).length;
    const percent = modules.length ? Math.round((completeModules / modules.length) * 100) : 0;
    return {
      stageId: stage.stageId,
      stageName: stage.stageName,
      status: completeModules === 0 ? 'NOT_STARTED' : completeModules === modules.length ? 'COMPLETE' : 'IN_PROGRESS',
      percent,
      modules,
      complete: completeModules === modules.length && modules.length > 0
    };
  }

  function findNextRequiredActivity(config, eventMap) {
    const stages = [...(config.stages || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const stage of stages) {
      const modules = [...(stage.modules || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
      for (const module of modules) {
        const activities = (module.activities || []).filter(activity => activity.required !== false);
        for (const activity of activities) {
          if (!activitySatisfied(activity, eventMap.get(activity.activityId))) {
            return {
              stageId: stage.stageId,
              moduleId: module.moduleId,
              activityId: activity.activityId,
              activityType: activity.activityType
            };
          }
        }
        if (!module.definitionComplete) {
          return {
            stageId: stage.stageId,
            moduleId: module.moduleId,
            activityId: null,
            activityType: null,
            blockedReason: 'MODULE_DEFINITION_INCOMPLETE'
          };
        }
      }
    }
    return null;
  }

  function calculate(config, events) {
    if (!config || typeof config !== 'object') throw new Error('Programme config is required.');
    if (!config.programmeId) throw new Error('programmeId is required.');

    const eventMap = latestEventByActivity(events, config.programmeId);
    const stages = (config.stages || []).map(stage => stageProgress(stage, eventMap));
    const definitionComplete = config.definitionStatus === 'COMPLETE' && stages.every(stage => stage.status !== 'PARTIAL_DEFINITION');

    let percent = null;
    let status = 'PARTIAL_DEFINITION';

    if (definitionComplete) {
      const requiredStages = stages;
      const completedStages = requiredStages.filter(stage => stage.complete).length;
      percent = requiredStages.length ? Math.round((completedStages / requiredStages.length) * 100) : 0;
      status = completedStages === 0 ? 'NOT_STARTED' : completedStages === requiredStages.length ? 'COMPLETE' : 'IN_PROGRESS';
    }

    return {
      programmeId: config.programmeId,
      status,
      percent,
      definitionComplete,
      stages,
      nextRequired: findNextRequiredActivity(config, eventMap),
      warning: definitionComplete ? null : 'Overall programme percentage withheld until required pathway definitions are complete.'
    };
  }

  return { calculate };
})();
