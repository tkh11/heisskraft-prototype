(function (global) {
  function parseMetric(value) {
    if (value == null || value === '—') return null;
    const match = String(value).replace(/\s/g, ' ').match(/-?\d+(?:[.,]\d+)?/);
    if (!match) return null;
    const number = Number(match[0].replace(',', '.'));
    return Number.isFinite(number) ? number : null;
  }

  function formatMetric(value, unit) {
    if (value == null || !Number.isFinite(value)) return '';
    const text = String(Math.round(value * 1000) / 1000).replace('.', ',');
    return unit ? text + ' ' + unit : text;
  }

  function isSelectablePump(product) {
    if (!product || !product.pumpType) return false;
    const specs = product.specs || {};
    return parseMetric(specs.flow) != null && parseMetric(specs.head) != null;
  }

  function findById(list, id) {
    return (list || []).find((item) => item.id === id) || null;
  }

  function normalizePump(product, taxonomy) {
    const specs = product.specs || {};
    const category = findById(taxonomy.categories, product.category);
    const subcategory = category && findById(category.subcategories, product.subcategory);
    const applications = (product.applications || [])
      .map((id) => findById(taxonomy.applications, id))
      .filter(Boolean);
    const flow = parseMetric(specs.flow);
    const head = parseMetric(specs.head);
    const power = parseMetric(specs.power);
    const efficiency = parseMetric(specs.efficiency || specs.eta);
    const npsh = parseMetric(specs.npsh);
    const pumpCount = parseMetric(specs.pumps || specs.pumpCount);
    const vfdRaw = specs.vfd || specs.frequencyControl || product.frequencyControl;
    let vfd = null;
    if (vfdRaw === true || vfdRaw === 'да' || vfdRaw === 'yes') vfd = true;
    else if (vfdRaw === false || vfdRaw === 'нет' || vfdRaw === 'no') vfd = false;
    else if (typeof vfdRaw === 'string' && vfdRaw.trim()) vfd = vfdRaw.trim();

    return {
      id: product.id,
      name: product.name,
      series: product.series || '',
      sku: product.sku || '',
      image: product.image || '',
      description: product.description || '',
      pumpType: product.pumpType,
      categoryId: product.category || '',
      categoryName: category ? category.name : '',
      constructionId: product.subcategory || '',
      construction: subcategory ? subcategory.name : '',
      applications: applications,
      applicationIds: product.applications || [],
      flow: flow,
      head: head,
      power: power,
      efficiency: efficiency,
      npsh: npsh,
      pumpCount: pumpCount,
      vfd: vfd,
      flowText: specs.flow || formatMetric(flow, 'м³/ч'),
      headText: specs.head || formatMetric(head, 'м'),
      powerText: specs.power || '',
      efficiencyText: specs.efficiency || specs.eta || '',
      npshText: specs.npsh || '',
      connection: specs.connection || '',
      pressure: specs.pressure || '',
      source: product
    };
  }

  function optionList(pumps, getValue, getLabel) {
    const seen = {};
    const list = [];
    pumps.forEach((pump) => {
      const value = getValue(pump);
      const label = getLabel(pump);
      if (!value || seen[value]) return;
      seen[value] = true;
      list.push({ value: value, label: label || value });
    });
    return list.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  }

  function loadJsonPair() {
    if (global.Heisskraft) {
      return Promise.all([global.Heisskraft.catalog(), global.Heisskraft.products()]);
    }
    return Promise.all([
      fetch('data/catalog.json').then((response) => {
        if (!response.ok) throw new Error('Не удалось загрузить структуру каталога');
        return response.json();
      }),
      fetch('data/products.json').then((response) => {
        if (!response.ok) throw new Error('Не удалось загрузить каталог насосов');
        return response.json();
      })
    ]);
  }

  function loadPumpCatalog() {
    return loadJsonPair().then(([catalog, products]) => {
      const taxonomy = catalog && typeof catalog === 'object'
        ? catalog
        : { categories: [], applications: [] };
      if (!Array.isArray(taxonomy.categories)) taxonomy.categories = [];
      if (!Array.isArray(taxonomy.applications)) taxonomy.applications = [];
      const pumps = (Array.isArray(products) ? products : [])
        .filter(isSelectablePump)
        .map((product) => normalizePump(product, taxonomy));
      return {
        taxonomy: taxonomy,
        pumps: pumps,
        applications: taxonomy.applications.filter((item) => (
          pumps.some((pump) => pump.applicationIds.indexOf(item.id) !== -1)
        )),
        constructions: optionList(pumps, function (pump) { return pump.constructionId; }, function (pump) { return pump.construction; }),
        pumpTypes: optionList(pumps, function (pump) { return pump.pumpType; }, function (pump) { return pump.pumpType; })
      };
    });
  }

  global.HeisskraftPumpData = {
    parseMetric: parseMetric,
    formatMetric: formatMetric,
    isSelectablePump: isSelectablePump,
    normalizePump: normalizePump,
    loadPumpCatalog: loadPumpCatalog
  };
})(window);
