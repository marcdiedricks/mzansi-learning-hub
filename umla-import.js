globalThis.MzansiUMLAImport = (() => {
  const RECORDS_KEY = 'umla-imported-records-v0.1';
  const registry = new Map();

  function configure(programmes) {
    registry.clear();
    if (!Array.isArray(programmes)) return;
    programmes.forEach(programme => {
      if (programme?.programmeId) registry.set(programme.programmeId, programme);
    });
  }

  function validate(record) {
    const errors = [];
    if (!record || typeof record !== 'object' || Array.isArray(record)) errors.push('Record must be a JSON object.');
    if (record?.schemaVersion !== 'UMLA-LR-0.1') errors.push('schemaVersion must be UMLA-LR-0.1.');
    ['eventId','learnerId','programmeId','qualificationId','moduleId','activityId','activityType','eventType','outcome','occurredAt','createdAt','syncStatus'].forEach(key => {
      if (!record?.[key]) errors.push(`${key} is required.`);
    });

    if (!registry.size) {
      errors.push('Programme registry is not loaded.');
    } else if (record?.programmeId) {
      const programme = registry.get(record.programmeId);
      if (!programme) {
        errors.push('Programme is not registered in Mzansi Learning Hub.');
      } else if (record.qualificationId !== programme.qualificationId) {
        errors.push('qualificationId does not match the registered programme.');
      }
    }

    if (record?.syncStatus !== 'LOCAL_ONLY') errors.push('Pilot record must remain LOCAL_ONLY.');
    if (!record?.score || typeof record.score !== 'object') errors.push('score object is required.');
    return { valid: errors.length === 0, errors };
  }

  async function importRecord(record) {
    const check = validate(record);
    if (!check.valid) return check;
    const existing = (await MzansiHubStore.get(RECORDS_KEY)) || [];
    const duplicate = existing.some(item => item.eventId === record.eventId);
    if (!duplicate) {
      existing.push({ ...record, importedAt: new Date().toISOString() });
      await MzansiHubStore.set(RECORDS_KEY, existing);
    }
    return { valid: true, duplicate, record };
  }

  async function list() {
    return (await MzansiHubStore.get(RECORDS_KEY)) || [];
  }

  async function latest() {
    const records = await list();
    return records.length ? records[records.length - 1] : null;
  }

  return { configure, validate, importRecord, list, latest };
})();
