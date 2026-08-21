(function () {
  const SPEC_LABELS = {
    flow: 'Расход Q',
    head: 'Напор H',
    power: 'Мощность',
    connection: 'Диаметр',
    pressure: 'Давление',
    voltage: 'Напряжение',
    frequency: 'Частота',
    speed: 'Частота вращения',
    current: 'Ток номинальный',
    temperature: 'Температура жидкости',
    protection: 'Степень защиты',
    insulation: 'Класс изоляции',
    material: 'Материал',
    stages: 'Число рабочих колёс',
    weight: 'Масса',
    npsh: 'NPSH',
    standard: 'Стандарт характеристик',
    article220: 'Артикул 220 В',
    article380: 'Артикул 380 В'
  };
  const PUMP_FILTERS = [
    { key: 'pumpType', label: 'Тип насоса', from: 'pumpType' },
    { key: 'flow', label: 'Расход', from: 'specs.flow' },
    { key: 'head', label: 'Напор', from: 'specs.head' },
    { key: 'power', label: 'Мощность', from: 'specs.power' },
    { key: 'connection', label: 'Диаметр подключения', from: 'specs.connection' },
    { key: 'pressure', label: 'Рабочее давление', from: 'specs.pressure' },
    { key: 'voltage', label: 'Напряжение', from: 'specs.voltage' }
  ];

  const titleEl = document.getElementById('catalogTitle');
  const leadEl = document.getElementById('catalogLead');
  const breadcrumbEl = document.getElementById('catalogBreadcrumb');
  const subsEl = document.getElementById('catalogSubs');
  const filtersEl = document.getElementById('catalogFilters');
  const statusEl = document.getElementById('catalogStatus');
  const contentEl = document.getElementById('catalogContent');
  const findForm = document.getElementById('catalogFind');
  const queryInput = document.getElementById('catalogQuery');

  let taxonomy = { categories: [], applications: [] };
  let allProducts = [];
  let productFuse = null;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function params() {
    return new URLSearchParams(window.location.search);
  }

  const LEGACY_CATEGORIES = {
    water: { use: 'water' },
    heating: { use: 'heating' },
    full: {}
  };

  function readState() {
    const query = params();
    let category = query.get('category');
    let use = query.get('use');
    const legacy = LEGACY_CATEGORIES[category];
    if (legacy) {
      if (legacy.use && !use) use = legacy.use;
      category = null;
    }
    let view = query.get('view');
    if (view !== 'application') view = 'equipment';
    if (!query.get('view') && use && !category) view = 'application';
    const filters = {};
    PUMP_FILTERS.forEach((item) => {
      const value = query.get(item.key);
      if (value) filters[item.key] = value;
    });
    return {
      view,
      category,
      sub: query.get('sub'),
      use,
      q: (query.get('q') || '').trim(),
      filters
    };
  }

  function href(next) {
    const query = new URLSearchParams();
    if (next.view && next.view !== 'equipment' && !next.category) query.set('view', next.view);
    if (next.category) query.set('category', next.category);
    if (next.sub) query.set('sub', next.sub);
    if (next.use) query.set('use', next.use);
    if (next.q) query.set('q', next.q);
    Object.keys(next.filters || {}).forEach((key) => {
      if (next.filters[key]) query.set(key, next.filters[key]);
    });
    const serial = query.toString();
    return serial ? 'catalog.html?' + serial : 'catalog.html';
  }

  function findById(list, id) {
    return (list || []).find((item) => item.id === id) || null;
  }

  function specValue(product, path) {
    if (path === 'pumpType') return product.pumpType || '';
    if (path.indexOf('specs.') === 0) {
      const key = path.slice(6);
      const value = product.specs && product.specs[key];
      return value == null || value === '—' ? '' : String(value);
    }
    return '';
  }

  function crumb(parts) {
    breadcrumbEl.innerHTML = parts.map((part, index) => {
      const sep = index ? '<span aria-hidden="true">/</span>' : '';
      if (part.href && index !== parts.length - 1) {
        return sep + '<a href="' + part.href + '">' + escapeHtml(part.label) + '</a>';
      }
      return sep + '<span>' + escapeHtml(part.label) + '</span>';
    }).join('');
  }

  function setHeader(title, lead) {
    titleEl.textContent = title;
    leadEl.textContent = lead;
    document.title = title + ' — HEISSKRAFT';
  }

  function setMode(view) {
    document.querySelectorAll('.catalog-modes a').forEach((link) => {
      const active = link.dataset.mode === view;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function cards(items, makeHref) {
    if (!items || !items.length) return '';
    return '<div class="catalog-grid catalog-nav-grid">' + items.map((item) => (
      '<a class="catalog-card" href="' + makeHref(item) + '">' +
        '<div class="catalog-img"><img src="' + escapeHtml(item.image) + '" alt="" width="600" height="400" loading="lazy" decoding="async" /></div>' +
        '<h3>' + escapeHtml(item.name) + '</h3>' +
      '</a>'
    )).join('') + '</div>';
  }

  function productCard(product) {
    const specs = SPEC_LABELS && product.specs ? Object.keys(SPEC_LABELS).reduce((rows, key) => {
      const value = product.specs[key];
      if (value && value !== '—' && rows.length < 4) {
        rows.push(
          '<div><dt>' + escapeHtml(SPEC_LABELS[key]) + '</dt><dd>' + escapeHtml(value) + '</dd></div>'
        );
      }
      return rows;
    }, []) : [];
    const title = product.series ? product.series + ' · ' + product.name : product.name;
    return (
      '<article class="product-card" id="' + escapeHtml(product.id) + '">' +
        '<div class="product-card-img">' +
          '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" width="600" height="800" loading="lazy" decoding="async" />' +
        '</div>' +
        '<div class="product-card-body">' +
          '<h3>' + escapeHtml(title) + '</h3>' +
          (specs.length ? '<dl class="product-card-specs">' + specs.join('') + '</dl>' : '') +
          '<p class="product-card-price">Цена по запросу</p>' +
          '<div class="product-card-actions">' +
            '<button type="button" class="btn-primary" data-product-id="' + escapeHtml(product.id) + '">Подробнее</button>' +
            (window.requestQtyWrapHtml ? window.requestQtyWrapHtml(product) : '') +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function productGrid(list) {
    if (!list.length) return '<p class="catalog-status">В этом разделе пока нет товаров.</p>';
    return '<div class="product-grid">' + list.map(productCard).join('') + '</div>';
  }

  function applyFilters(list, state) {
    return list.filter((product) => {
      return PUMP_FILTERS.every((item) => {
        const selected = state.filters[item.key];
        if (!selected) return true;
        return specValue(product, item.from) === selected;
      });
    });
  }

  function searchProducts(query) {
    const q = query.trim();
    if (!q) return allProducts.slice();
    if (productFuse) return productFuse.search(q).map((result) => result.item);
    const needle = q.toLowerCase().replace(/ё/g, 'е');
    return allProducts.filter((product) => (
      [product.name, product.series, product.sku, product.id, product.description]
        .join(' ').toLowerCase().replace(/ё/g, 'е').includes(needle)
    ));
  }

  function renderFilters(list, state, showPumpFilters) {
    if (!showPumpFilters) {
      filtersEl.hidden = true;
      filtersEl.innerHTML = '';
      return;
    }
    const controls = PUMP_FILTERS.map((item) => {
      const values = Array.from(new Set(list.map((product) => specValue(product, item.from)).filter(Boolean))).sort();
      if (!values.length) return '';
      const selected = state.filters[item.key] || '';
      return (
        '<label>' + escapeHtml(item.label) +
          '<select name="' + item.key + '">' +
            '<option value="">Все</option>' +
            values.map((value) => (
              '<option value="' + escapeHtml(value) + '"' + (value === selected ? ' selected' : '') + '>' +
                escapeHtml(value) +
              '</option>'
            )).join('') +
          '</select>' +
        '</label>'
      );
    }).join('');
    filtersEl.innerHTML = controls || '';
    filtersEl.hidden = !controls;
  }

  function highlightHash() {
    const targetId = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;
    target.classList.add('is-highlighted');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => target.classList.remove('is-highlighted'), 2400);
  }

  function render() {
    const state = readState();
    if (queryInput) queryInput.value = state.q;
    setMode(state.view);
    if (statusEl) statusEl.hidden = true;
    if (contentEl) contentEl.hidden = false;

    let list = allProducts.slice();
    if (state.q) list = searchProducts(state.q);
    if (state.category) list = list.filter((product) => product.category === state.category);
    if (state.sub) list = list.filter((product) => product.subcategory === state.sub);
    if (state.use) list = list.filter((product) => (product.applications || []).indexOf(state.use) !== -1);

    const category = findById(taxonomy.categories, state.category);
    const subcategory = category && findById(category.subcategories, state.sub);
    const application = findById(taxonomy.applications, state.use);
    const showLanding = !state.category && !state.use && !state.q;

    if (showLanding && state.view === 'application') {
      setHeader('Каталог по применению', 'Сфера применения фильтрует общий список оборудования и не дублирует разделы каталога.');
      crumb([{ label: 'Главная', href: 'index.html' }, { label: 'Каталог', href: 'catalog.html' }, { label: 'По применению' }]);
      subsEl.innerHTML = '';
      filtersEl.hidden = true;
      contentEl.innerHTML = cards(taxonomy.applications, (item) => href({ view: 'application', use: item.id }));
      return;
    }

    if (showLanding) {
      setHeader('Каталог продукции', 'Основные категории оборудования HEISSKRAFT. Один товар — в одном разделе.');
      crumb([{ label: 'Главная', href: 'index.html' }, { label: 'Каталог' }]);
      subsEl.innerHTML = '';
      filtersEl.hidden = true;
      contentEl.innerHTML = cards(taxonomy.categories, (item) => href({ category: item.id }));
      return;
    }

    const trail = [{ label: 'Главная', href: 'index.html' }, { label: 'Каталог', href: 'catalog.html' }];
    let title = 'Каталог продукции';
    let lead = 'Подбор оборудования HEISSKRAFT.';

    if (state.q) {
      title = 'Поиск: «' + state.q + '»';
      lead = 'Результаты по названию, серии и артикулу.';
      trail.push({ label: 'Поиск' });
    }
    if (application) {
      title = application.name;
      lead = application.lead;
      trail.push({ label: 'По применению', href: href({ view: 'application' }) });
      trail.push({ label: application.name });
    }
    if (category) {
      title = subcategory ? subcategory.name : category.name;
      lead = category.lead;
      trail.push({ label: category.name, href: href({ category: category.id }) });
      if (subcategory) trail.push({ label: subcategory.name });
      subsEl.innerHTML = state.sub ? '' : cards(category.subcategories || [], (item) => href({
        category: category.id,
        sub: item.id
      }));
    } else {
      subsEl.innerHTML = '';
    }

    setHeader(title, lead);
    crumb(trail);

    const beforeFilters = list.slice();
    const filtered = applyFilters(list, state);
    const showPumpFilters = filtered.some((product) => product.pumpType) || beforeFilters.some((product) => product.pumpType);
    renderFilters(beforeFilters, state, showPumpFilters && (state.category === 'pumps' || beforeFilters.some((product) => product.pumpType)));
    contentEl.innerHTML = productGrid(filtered);
    window.requestAnimationFrame(highlightHash);
  }

  const modalEl = document.getElementById('productModal');
  const modalTitleEl = document.getElementById('productModalTitle');
  const modalBodyEl = document.getElementById('productModalBody');
  const modalCloseEl = document.getElementById('productModalClose');
  const pageRoot = document.getElementById('page');
  let lastModalFocus = null;

  function closeProductModal() {
    if (!modalEl || !modalEl.classList.contains('is-open')) return;
    modalEl.classList.remove('is-open');
    modalEl.setAttribute('aria-hidden', 'true');
    if (pageRoot) {
      pageRoot.removeAttribute('inert');
      pageRoot.removeAttribute('aria-hidden');
    }
    document.body.style.overflow = '';
    if (lastModalFocus && typeof lastModalFocus.focus === 'function') lastModalFocus.focus();
  }

  function bindProductDocTabs(root) {
    if (!root) return;
    const tabs = root.querySelectorAll('[data-doc-tab]');
    const panels = root.querySelectorAll('[data-doc-panel]');
    if (!tabs.length) return;
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const id = tab.getAttribute('data-doc-tab');
        tabs.forEach((item) => {
          const on = item === tab;
          item.classList.toggle('is-active', on);
          item.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panels.forEach((panel) => {
          panel.hidden = panel.getAttribute('data-doc-panel') !== id;
        });
      });
    });
  }

  function openProductModal(product) {
    if (!modalEl || !modalBodyEl || !product) return;
    lastModalFocus = document.activeElement;
    const category = findById(taxonomy.categories, product.category);
    const subcategory = category && findById(category.subcategories, product.subcategory);
    const apps = (product.applications || []).map((id) => findById(taxonomy.applications, id)).filter(Boolean);
    const specRows = [];
    if (product.pumpType) {
      specRows.push('<div><dt>Тип насоса</dt><dd>' + escapeHtml(product.pumpType) + '</dd></div>');
    }
    Object.keys(SPEC_LABELS).forEach((key) => {
      const value = product.specs && product.specs[key];
      if (value && value !== '—') {
        specRows.push('<div><dt>' + escapeHtml(SPEC_LABELS[key]) + '</dt><dd>' + escapeHtml(value) + '</dd></div>');
      }
    });
    if (product.specs) {
      Object.keys(product.specs).forEach((key) => {
        if (SPEC_LABELS[key]) return;
        const value = product.specs[key];
        if (!value || value === '—') return;
        specRows.push('<div><dt>' + escapeHtml(key) + '</dt><dd>' + escapeHtml(value) + '</dd></div>');
      });
    }

    const hasGraph = !!product.graph;
    const hasDrawing = !!product.drawing;
    const specBlock =
      (product.description ? '<p class="product-modal-desc">' + escapeHtml(product.description) + '</p>' : '') +
      (specRows.length ? '<dl class="product-modal-specs">' + specRows.join('') + '</dl>' : '') +
      (apps.length ? '<div class="product-modal-apps">' + apps.map((item) => '<span>' + escapeHtml(item.name) + '</span>').join('') + '</div>' : '');
    const docs = (hasGraph || hasDrawing)
      ? '<div class="product-docs">' +
          '<div class="product-doc-tabs" role="tablist">' +
            '<button type="button" class="product-doc-tab is-active" role="tab" aria-selected="true" data-doc-tab="info">Характеристики</button>' +
            (hasGraph ? '<button type="button" class="product-doc-tab" role="tab" aria-selected="false" data-doc-tab="graph">График</button>' : '') +
            (hasDrawing ? '<button type="button" class="product-doc-tab" role="tab" aria-selected="false" data-doc-tab="drawing">Чертёж</button>' : '') +
          '</div>' +
          '<div class="product-doc-panel" data-doc-panel="info">' + specBlock + '</div>' +
          (hasGraph ? '<div class="product-doc-panel" data-doc-panel="graph" hidden><div class="product-doc-figure"><img src="' + escapeHtml(product.graph) + '" alt="График характеристик ' + escapeHtml(product.name) + '" /></div></div>' : '') +
          (hasDrawing ? '<div class="product-doc-panel" data-doc-panel="drawing" hidden><div class="product-doc-figure"><img src="' + escapeHtml(product.drawing) + '" alt="Чертёж ' + escapeHtml(product.name) + '" /></div></div>' : '') +
        '</div>'
      : specBlock;

    modalTitleEl.textContent = product.name;
    modalBodyEl.innerHTML =
      '<div class="product-modal-layout">' +
        '<div class="product-modal-photo">' +
          '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" width="600" height="800" />' +
        '</div>' +
        '<div>' +
          '<div class="product-modal-meta">' +
            (product.series ? '<span>Серия: ' + escapeHtml(product.series) + '</span>' : '') +
            (product.sku ? '<span>Артикул: ' + escapeHtml(product.sku) + '</span>' : '') +
            (category ? '<span>Раздел: ' + escapeHtml(category.name) + '</span>' : '') +
            (subcategory ? '<span>Подкатегория: ' + escapeHtml(subcategory.name) + '</span>' : '') +
          '</div>' +
          docs +
          '<div class="product-modal-actions">' +
            '<p class="product-card-price">Цена по запросу</p>' +
            '<div class="product-modal-buttons">' +
              (window.requestQtyWrapHtml ? window.requestQtyWrapHtml(product) : (
                '<button type="button" class="btn-secondary" data-add-to-request="' + escapeHtml(product.id) + '">Добавить в заявку</button>'
              )) +
              '<button type="button" class="btn-primary" data-action="request">Оставить заявку</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    bindProductDocTabs(modalBodyEl);

    if (pageRoot) {
      pageRoot.setAttribute('inert', '');
      pageRoot.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(function () {
      modalEl.classList.add('is-open');
      modalEl.setAttribute('aria-hidden', 'false');
      if (modalCloseEl) modalCloseEl.focus();
    });
  }

  if (contentEl) {
    contentEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-product-id]');
      if (!button || !contentEl.contains(button)) return;
      event.preventDefault();
      event.stopPropagation();
      const product = findById(allProducts, button.getAttribute('data-product-id'));
      if (product) openProductModal(product);
    });
  }

  if (modalEl) {
    modalEl.addEventListener('click', (event) => {
      if (event.target === modalEl) {
        closeProductModal();
        return;
      }
      const requestBtn = event.target.closest('[data-action="request"]');
      if (!requestBtn) return;
      event.preventDefault();
      event.stopPropagation();
      closeProductModal();
      if (window.openRequestForm) window.openRequestForm();
      else if (window.showToast) window.showToast('Форма заявки — скоро появится');
    });
  }

  if (modalCloseEl) modalCloseEl.addEventListener('click', closeProductModal);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalEl.classList.contains('is-open')) {
      event.preventDefault();
      closeProductModal();
    }
  });

  function updateFilters(event) {
    event.preventDefault();
    const state = readState();
    const nextFilters = {};
    PUMP_FILTERS.forEach((item) => {
      const field = filtersEl.elements[item.key];
      if (field && field.value) nextFilters[item.key] = field.value;
    });
    const url = href(Object.assign({}, state, { filters: nextFilters }));
    window.history.replaceState({}, '', url);
    render();
  }

  if (filtersEl) filtersEl.addEventListener('change', updateFilters);

  if (findForm) {
    findForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const state = readState();
      const url = href(Object.assign({}, state, { q: queryInput ? queryInput.value.trim() : '' }));
      window.history.pushState({}, '', url);
      render();
    });
  }

  window.addEventListener('popstate', render);

  function dataApi() {
    return window.Heisskraft || null;
  }

  function loadCatalogData() {
    const api = dataApi();
    if (api) return Promise.all([api.catalog(), api.products()]);
    return Promise.all([
      fetch('data/catalog.json').then((response) => {
        if (!response.ok) throw new Error('Не удалось загрузить структуру каталога');
        return response.json();
      }),
      fetch('data/products.json').then((response) => {
        if (!response.ok) throw new Error('Не удалось загрузить товары');
        return response.json();
      })
    ]);
  }

  function buildProductFuse() {
    if (typeof Fuse !== 'function' || !allProducts.length) return;
    productFuse = new Fuse(allProducts, { keys: ['name', 'series', 'sku', 'id', 'description'], threshold: 0.35, ignoreLocation: true });
  }

  loadCatalogData().then(([catalog, products]) => {
    taxonomy = catalog && typeof catalog === 'object' ? catalog : { categories: [], applications: [] };
    if (!Array.isArray(taxonomy.categories)) taxonomy.categories = [];
    if (!Array.isArray(taxonomy.applications)) taxonomy.applications = [];
    allProducts = Array.isArray(products) ? products : [];
    buildProductFuse();
    render();
    if (typeof Fuse !== 'function' && dataApi() && typeof dataApi().loadFuse === 'function') {
      dataApi().loadFuse().then(buildProductFuse).catch(() => {});
    }
  }).catch((err) => {
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.classList.add('is-error');
      statusEl.textContent = err.message || 'Не удалось загрузить каталог';
    }
    console.error(err);
  });
})();
