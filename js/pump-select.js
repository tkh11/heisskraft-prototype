(function (global) {
  function parseInputNumber(raw) {
    const text = String(raw == null ? '' : raw).trim().replace(/\s/g, '').replace(',', '.');
    if (!text) return { empty: true, value: null };
    if (!/^-?\d+(\.\d+)?$/.test(text)) return { empty: false, value: null, invalid: true };
    const value = Number(text);
    if (!Number.isFinite(value)) return { empty: false, value: null, invalid: true };
    return { empty: false, value: value };
  }

  function validateDuty(qRaw, hRaw) {
    const errors = {};
    const qParsed = parseInputNumber(qRaw);
    const hParsed = parseInputNumber(hRaw);

    if (qParsed.empty) errors.q = 'Укажите расход Q';
    else if (qParsed.invalid) errors.q = 'Расход должен быть числом, например 4 или 2,5';
    else if (qParsed.value <= 0) errors.q = 'Расход должен быть больше нуля';
    else if (qParsed.value > 10000) errors.q = 'Проверьте расход: значение слишком большое';

    if (hParsed.empty) errors.h = 'Укажите напор H';
    else if (hParsed.invalid) errors.h = 'Напор должен быть числом, например 50 или 8,5';
    else if (hParsed.value <= 0) errors.h = 'Напор должен быть больше нуля';
    else if (hParsed.value > 2000) errors.h = 'Проверьте напор: значение слишком большое';

    return {
      ok: !errors.q && !errors.h,
      errors: errors,
      q: errors.q ? null : qParsed.value,
      h: errors.h ? null : hParsed.value
    };
  }

  function matchesFilters(pump, filters) {
    if (filters.application && pump.applicationIds.indexOf(filters.application) === -1) return false;
    if (filters.construction && pump.constructionId !== filters.construction) return false;
    if (filters.pumpType && pump.pumpType !== filters.pumpType) return false;
    return true;
  }

  function coversDuty(pump, q, h) {
    return pump.flow + 1e-9 >= q && pump.head + 1e-9 >= h;
  }

  function scorePump(pump, q, h) {
    const qRel = (pump.flow - q) / q;
    const hRel = (pump.head - h) / h;
    const qPenalty = pump.flow >= q ? qRel * qRel : Math.pow((q - pump.flow) / q, 2) * 8;
    const hPenalty = pump.head >= h ? hRel * hRel : Math.pow((h - pump.head) / h, 2) * 8;
    return qPenalty + hPenalty;
  }

  function attachMeta(pump, q, h, optimal) {
    return Object.assign({}, pump, {
      score: scorePump(pump, q, h),
      covers: coversDuty(pump, q, h),
      optimal: Boolean(optimal),
      duty: { q: q, h: h }
    });
  }

  function selectPumps(pumps, query) {
    const filters = {
      application: query.application || '',
      construction: query.construction || '',
      pumpType: query.pumpType || ''
    };
    const q = query.q;
    const h = query.h;
    const filtered = (pumps || []).filter((pump) => matchesFilters(pump, filters));
    const ranked = filtered
      .map((pump) => attachMeta(pump, q, h, false))
      .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, 'ru'));
    const matches = ranked.filter((pump) => pump.covers);
    if (matches.length) matches[0] = attachMeta(matches[0], q, h, true);
    return {
      matches: matches,
      nearest: ranked.slice(0, 5),
      filteredCount: filtered.length
    };
  }

  global.HeisskraftPumpSelect = {
    parseInputNumber: parseInputNumber,
    validateDuty: validateDuty,
    selectPumps: selectPumps
  };
})(window);
