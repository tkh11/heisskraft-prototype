(function () {
  const dataApi = window.HeisskraftPumpData;
  const selectApi = window.HeisskraftPumpSelect;
  const MAX_COMPARE = 3;

  const form = document.getElementById('pumpSelectForm');
  const resultsEl = document.getElementById('pumpResults');
  const compareBar = document.getElementById('pumpCompareBar');
  const compareCountEl = document.getElementById('pumpCompareCount');
  const compareOpenBtn = document.getElementById('pumpCompareOpen');
  const modalEl = document.getElementById('productModal');
  const modalTitleEl = document.getElementById('productModalTitle');
  const modalBodyEl = document.getElementById('productModalBody');
  const modalCloseEl = document.getElementById('productModalClose');
  const compareModal = document.getElementById('compareModal');
  const compareBody = document.getElementById('compareModalBody');
  const compareClose = document.getElementById('compareModalClose');
  const pageRoot = document.getElementById('page');

  let catalog = { pumps: [], applications: [], constructions: [], pumpTypes: [] };
  let lastQuery = null;
  let lastResult = null;
  let showingNearest = false;
  const selected = [];
  let lastModalFocus = null;
  let openPump = null;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function formatRu(value, unit) {
    return dataApi.formatMetric(value, unit);
  }

  function fieldError(id, message) {
    const input = document.getElementById(id);
    const error = document.getElementById(id + 'Error');
    const wrap = input && input.closest('.pump-field');
    if (wrap) wrap.classList.toggle('has-error', Boolean(message));
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) error.textContent = message || '';
  }

  function optionsHtml(items, valueKey, labelKey) {
    return ['<option value="">Не важно</option>'].concat((items || []).map((item) => (
      '<option value="' + escapeHtml(item[valueKey]) + '">' + escapeHtml(item[labelKey]) + '</option>'
    ))).join('');
  }

  function fillFilters() {
    const application = document.getElementById('pumpApplication');
    const construction = document.getElementById('pumpConstruction');
    const pumpType = document.getElementById('pumpType');
    if (application) {
      application.innerHTML = optionsHtml(catalog.applications, 'id', 'name');
    }
    if (construction) {
      construction.innerHTML = optionsHtml(catalog.constructions, 'value', 'label');
    }
    if (pumpType) {
      pumpType.innerHTML = optionsHtml(catalog.pumpTypes, 'value', 'label');
    }
  }

  function readQuery() {
    return {
      qRaw: document.getElementById('pumpQ').value,
      hRaw: document.getElementById('pumpH').value,
      application: document.getElementById('pumpApplication').value,
      construction: document.getElementById('pumpConstruction').value,
      pumpType: document.getElementById('pumpType').value
    };
  }

  function isSelected(id) {
    return selected.some((item) => item.id === id);
  }

  function specRow(label, value) {
    if (!value) return '';
    return '<div><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>';
  }

  function pumpCard(pump) {
    const extra = [];
    extra.push(specRow('Расход Q', pump.flowText));
    extra.push(specRow('Напор H', pump.headText));
    extra.push(specRow('Мощность P2', pump.powerText));
    if (pump.efficiencyText) extra.push(specRow('КПД', pump.efficiencyText));
    if (pump.npshText) extra.push(specRow('NPSH', pump.npshText));
    const compared = isSelected(pump.id);
    return (
      '<article class="product-card pump-result-card' + (pump.optimal ? ' is-optimal' : '') + '">' +
        (pump.optimal ? '<span class="pump-badge">Оптимальный выбор</span>' : '') +
        '<div class="product-card-img"><img src="' + escapeHtml(pump.image) + '" alt="" width="600" height="800" loading="lazy" /></div>' +
        '<div class="product-card-body">' +
          '<h3>' + escapeHtml(pump.name) + '</h3>' +
          (pump.series ? '<p class="product-card-desc">Серия ' + escapeHtml(pump.series) + '</p>' : '') +
          '<dl class="product-card-specs">' + extra.join('') + '</dl>' +
          '<div class="pump-card-actions">' +
            '<button type="button" class="btn-primary" data-pump-detail="' + escapeHtml(pump.id) + '">Подробнее</button>' +
            '<button type="button" class="btn-secondary' + (compared ? ' is-active' : '') + '" data-pump-compare="' + escapeHtml(pump.id) + '">' +
              (compared ? 'В сравнении' : 'Сравнить') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function emptyState() {
    return (
      '<div class="pump-empty">' +
        '<h2>По заданным параметрам точного совпадения не найдено</h2>' +
        '<p>В каталоге нет насоса, у которого номинальные расход и напор одновременно покрывают заданную рабочую точку.</p>' +
        '<div class="pump-empty-actions">' +
          '<button type="button" class="btn-primary" data-pump-nearest>Показать ближайшие варианты</button>' +
          '<button type="button" class="btn-secondary" data-pump-edit>Изменить параметры</button>' +
          '<button type="button" class="btn-secondary" data-pump-consult>Получить помощь инженера</button>' +
        '</div>' +
      '</div>'
    );
  }

  function renderCompareBar() {
    if (!compareBar) return;
    const count = selected.length;
    const hasResults = listPumps().length > 0;
    compareBar.hidden = !hasResults;
    if (compareOpenBtn) {
      compareOpenBtn.disabled = count < 1;
      compareOpenBtn.setAttribute('aria-disabled', count < 1 ? 'true' : 'false');
    }
    if (compareCountEl) {
      compareCountEl.textContent = count
        ? 'Выбрано: ' + count + ' из ' + MAX_COMPARE
        : 'Выберите насос для сравнения';
    }
  }

  function listPumps() {
    if (!lastResult) return [];
    if (lastResult.matches.length) return lastResult.matches;
    return showingNearest ? lastResult.nearest : [];
  }

  function renderResults() {
    if (!resultsEl || !lastResult || !lastQuery) return;
    const matches = lastResult.matches;
    if (!matches.length && !showingNearest) {
      resultsEl.hidden = false;
      resultsEl.innerHTML = emptyState();
      renderCompareBar();
      resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const list = matches.length ? matches : lastResult.nearest;
    const title = matches.length
      ? 'Подходящие насосы — найдено ' + list.length
      : 'Ближайшие варианты — ' + list.length;
    resultsEl.hidden = false;
    resultsEl.innerHTML =
      '<h2 class="catalog-group-title">' + escapeHtml(title) + '</h2>' +
      (matches.length ? '' : '<p class="catalog-lead">Точного покрытия рабочей точки нет. Показаны ближайшие модели по номинальным Q и H.</p>') +
      '<div class="product-grid pump-result-grid">' + list.map(pumpCard).join('') + '</div>';
    renderCompareBar();
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function lockPage(on) {
    if (on) {
      if (pageRoot) {
        pageRoot.setAttribute('inert', '');
        pageRoot.setAttribute('aria-hidden', 'true');
      }
      document.body.style.overflow = 'hidden';
      return;
    }
    const other = document.getElementById('requestModal') && document.getElementById('requestModal').classList.contains('is-open');
    if (pageRoot && !other) {
      pageRoot.removeAttribute('inert');
      pageRoot.removeAttribute('aria-hidden');
    }
    if (!other) document.body.style.overflow = '';
  }

  function closeModal() {
    if (!modalEl || !modalEl.classList.contains('is-open')) return;
    modalEl.classList.remove('is-open');
    modalEl.setAttribute('aria-hidden', 'true');
    openPump = null;
    lockPage(false);
    if (lastModalFocus && typeof lastModalFocus.focus === 'function') lastModalFocus.focus();
  }

  function closeCompare() {
    if (!compareModal || !compareModal.classList.contains('is-open')) return;
    compareModal.classList.remove('is-open');
    compareModal.setAttribute('aria-hidden', 'true');
    lockPage(false);
    if (lastModalFocus && typeof lastModalFocus.focus === 'function') lastModalFocus.focus();
  }

  function dutyChart(pump) {
    const q = pump.duty && pump.duty.q;
    const h = pump.duty && pump.duty.h;
    if (q == null || h == null || pump.flow == null || pump.head == null) return '';
    const maxQ = Math.max(q, pump.flow) * 1.2;
    const maxH = Math.max(h, pump.head) * 1.2;
    const w = 360;
    const ht = 220;
    const padL = 42;
    const padB = 32;
    const padT = 16;
    const padR = 16;
    const innerW = w - padL - padR;
    const innerH = ht - padT - padB;
    function x(value) { return padL + (value / maxQ) * innerW; }
    function y(value) { return padT + innerH - (value / maxH) * innerH; }
    return (
      '<div class="pump-chart">' +
        '<p class="pump-chart-title">Рабочая точка системы и номинальная точка насоса</p>' +
        '<svg viewBox="0 0 ' + w + ' ' + ht + '" role="img" aria-label="Диаграмма Q-H">' +
          '<line x1="' + padL + '" y1="' + (padT + innerH) + '" x2="' + (w - padR) + '" y2="' + (padT + innerH) + '" stroke="#e5e7eb"/>' +
          '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + innerH) + '" stroke="#e5e7eb"/>' +
          '<text x="' + (w - padR) + '" y="' + (ht - 8) + '" text-anchor="end" font-size="11" fill="#6b7280">Q, м³/ч</text>' +
          '<text x="8" y="' + (padT + 8) + '" font-size="11" fill="#6b7280">H, м</text>' +
          '<circle cx="' + x(q) + '" cy="' + y(h) + '" r="6" fill="#ed1c24"/>' +
          '<circle cx="' + x(pump.flow) + '" cy="' + y(pump.head) + '" r="6" fill="#111827"/>' +
        '</svg>' +
        '<p class="pump-chart-legend"><span class="is-duty">●</span> рабочая точка системы · <span class="is-rated">●</span> номинальная точка насоса из каталога</p>' +
        '<p class="pump-chart-note">Кривая характеристики в данных каталога отсутствует, поэтому график показывает только две известные точки.</p>' +
      '</div>'
    );
  }

  function vfdText(pump) {
    if (pump.vfd === true) return 'есть';
    if (pump.vfd === false) return 'нет';
    if (typeof pump.vfd === 'string') return pump.vfd;
    return 'нет данных в карточке';
  }

  function dutyText(pump) {
    if (!pump.duty) return '';
    return formatRu(pump.duty.q, 'м³/ч') + ' / ' + formatRu(pump.duty.h, 'м');
  }

  function consultText(pumps) {
    const parts = ['Подбор насоса HEISSKRAFT.'];
    if (lastQuery) {
      const duty = selectApi.validateDuty(lastQuery.qRaw, lastQuery.hRaw);
      if (duty.ok) parts.push('Рабочая точка: Q = ' + formatRu(duty.q, 'м³/ч') + ', H = ' + formatRu(duty.h, 'м') + '.');
    }
    const list = (pumps || []).filter(Boolean);
    if (list.length === 1) {
      parts.push('Модель: ' + list[0].name + (list[0].sku ? ' (' + list[0].sku + ')' : '') + '.');
    } else if (list.length > 1) {
      parts.push('Модели для сравнения: ' + list.map((pump) => (
        pump.name + (pump.sku ? ' (' + pump.sku + ')' : '')
      )).join(', ') + '.');
    }
    parts.push('Прошу коммерческое предложение / консультацию инженера.');
    return parts.join(' ');
  }

  function addPumpsToRequest(pumps) {
    if (!window.addToRequestCart) return;
    (pumps || []).forEach((pump) => {
      if (!pump) return;
      const product = pump.source || pump;
      if (!window.isInRequestCart || !window.isInRequestCart(product.id)) {
        window.addToRequestCart(product);
      }
    });
  }

  function openRequest(pumps) {
    const list = Array.isArray(pumps) ? pumps.filter(Boolean) : (pumps ? [pumps] : []);
    closeModal();
    closeCompare();
    addPumpsToRequest(list);
    if (window.openRequestForm) {
      window.openRequestForm({ details: consultText(list) });
    } else if (window.showToast) {
      window.showToast('Форма заявки — скоро появится');
    }
  }

  function printPdf(pump) {
    const rows = [
      ['Название', pump.name],
      ['Серия', pump.series],
      ['Артикул', pump.sku],
      ['Тип насоса', pump.pumpType],
      ['Конструкция', pump.construction],
      ['Расход Q', pump.flowText],
      ['Напор H', pump.headText],
      ['Рабочая точка', dutyText(pump)],
      ['Мощность P2', pump.powerText],
      ['КПД', pump.efficiencyText],
      ['NPSH', pump.npshText],
      ['Количество насосов', pump.pumpCount != null ? String(pump.pumpCount) : ''],
      ['Частотное регулирование', pump.vfd == null ? '' : vfdText(pump)]
    ].filter((row) => row[1]);
    const html = '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>' +
      escapeHtml(pump.name) + '</title><style>body{font-family:Inter,system-ui,sans-serif;padding:32px;color:#111}h1{margin:0 0 8px}table{width:100%;border-collapse:collapse;margin-top:24px}td{border-bottom:1px solid #e5e7eb;padding:8px 0}td:first-child{color:#6b7280;width:40%}</style></head><body><h1>' +
      escapeHtml(pump.name) + '</h1><p>Карточка подбора HEISSKRAFT</p><table>' +
      rows.map((row) => '<tr><td>' + escapeHtml(row[0]) + '</td><td>' + escapeHtml(row[1]) + '</td></tr>').join('') +
      '</table></body></html>';
    const win = window.open('', '_blank');
    if (!win) {
      if (window.showToast) window.showToast('Разрешите всплывающие окна, чтобы сохранить PDF');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  function openDetail(pump) {
    if (!modalEl || !modalBodyEl || !pump) return;
    lastModalFocus = document.activeElement;
    openPump = pump;
    const apps = (pump.applications || []).map((item) => item.name).join(', ');
    modalTitleEl.textContent = pump.name;
    modalBodyEl.innerHTML =
      '<div class="product-modal-layout">' +
        '<div class="product-modal-photo">' +
          '<img src="' + escapeHtml(pump.image) + '" alt="' + escapeHtml(pump.name) + '" />' +
        '</div>' +
        '<div>' +
          '<div class="product-modal-meta">' +
            (pump.series ? '<span>Серия: ' + escapeHtml(pump.series) + '</span>' : '') +
            (pump.sku ? '<span>Артикул: ' + escapeHtml(pump.sku) + '</span>' : '') +
            (pump.pumpType ? '<span>Тип: ' + escapeHtml(pump.pumpType) + '</span>' : '') +
            (pump.construction ? '<span>Конструкция: ' + escapeHtml(pump.construction) + '</span>' : '') +
          '</div>' +
          (pump.description ? '<p class="product-modal-desc">' + escapeHtml(pump.description) + '</p>' : '') +
          '<dl class="product-modal-specs">' +
            specRow('Расход Q', pump.flowText) +
            specRow('Напор H', pump.headText) +
            specRow('Фактическая рабочая точка', dutyText(pump)) +
            specRow('Мощность P2', pump.powerText) +
            specRow('КПД', pump.efficiencyText || 'нет данных в карточке') +
            specRow('NPSH', pump.npshText || 'нет данных в карточке') +
            specRow('Количество насосов', pump.pumpCount != null ? String(pump.pumpCount) : 'нет данных в карточке') +
            specRow('Частотное регулирование', vfdText(pump)) +
            specRow('Применение', apps) +
            specRow('Диаметр', pump.connection) +
            specRow('Давление', pump.pressure) +
          '</dl>' +
          dutyChart(pump) +
          '<div class="product-modal-actions">' +
            '<div class="product-modal-buttons">' +
              '<button type="button" class="btn-secondary" data-pump-pdf>Скачать PDF</button>' +
              '<button type="button" class="btn-primary" data-pump-quote>Запросить КП</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    lockPage(true);
    window.requestAnimationFrame(function () {
      modalEl.classList.add('is-open');
      modalEl.setAttribute('aria-hidden', 'false');
      if (modalCloseEl) modalCloseEl.focus();
    });
  }

  function compareValue(pump, key) {
    if (key === 'name') return pump.name;
    if (key === 'series') return pump.series;
    if (key === 'type') return pump.pumpType;
    if (key === 'construction') return pump.construction;
    if (key === 'flow') return pump.flowText;
    if (key === 'head') return pump.headText;
    if (key === 'power') return pump.powerText;
    if (key === 'efficiency') return pump.efficiencyText;
    if (key === 'npsh') return pump.npshText;
    return '';
  }

  function openCompare() {
    if (!selected.length || !compareModal || !compareBody) return;
    lastModalFocus = document.activeElement;
    const fields = [
      { key: 'name', label: 'Модель' },
      { key: 'series', label: 'Серия' },
      { key: 'type', label: 'Тип насоса' },
      { key: 'construction', label: 'Конструкция' },
      { key: 'flow', label: 'Расход Q' },
      { key: 'head', label: 'Напор H' },
      { key: 'power', label: 'Мощность P2' },
      { key: 'efficiency', label: 'КПД' },
      { key: 'npsh', label: 'NPSH' }
    ];
    compareBody.innerHTML =
      '<div class="pump-compare-table-wrap"><table class="pump-compare-table"><thead><tr><th>Параметр</th>' +
      selected.map((pump) => '<th>' + escapeHtml(pump.name) + '</th>').join('') +
      '</tr></thead><tbody>' +
      fields.map((field) => (
        '<tr><th>' + escapeHtml(field.label) + '</th>' +
        selected.map((pump) => '<td>' + escapeHtml(compareValue(pump, field.key) || '—') + '</td>').join('') +
        '</tr>'
      )).join('') +
      '</tbody></table></div>' +
      '<div class="product-modal-buttons pump-compare-actions">' +
        '<button type="button" class="btn-primary" data-pump-consult>Получить консультацию</button>' +
      '</div>';
    lockPage(true);
    compareModal.classList.add('is-open');
    compareModal.setAttribute('aria-hidden', 'false');
    if (compareClose) compareClose.focus();
  }

  function toggleCompare(pump) {
    const index = selected.findIndex((item) => item.id === pump.id);
    if (index >= 0) {
      selected.splice(index, 1);
    } else if (selected.length >= MAX_COMPARE) {
      if (window.showToast) window.showToast('Можно сравнить не больше ' + MAX_COMPARE + ' насосов');
      return;
    } else {
      selected.push(pump);
    }
    renderCompareBar();
    if (lastResult) renderResults();
  }

  function runSelect(showNearest) {
    const raw = readQuery();
    const duty = selectApi.validateDuty(raw.qRaw, raw.hRaw);
    fieldError('pumpQ', duty.errors.q);
    fieldError('pumpH', duty.errors.h);
    if (!duty.ok) {
      const first = duty.errors.q ? document.getElementById('pumpQ') : document.getElementById('pumpH');
      if (first) first.focus();
      return;
    }
    lastQuery = Object.assign({}, raw, { q: duty.q, h: duty.h });
    lastResult = selectApi.selectPumps(catalog.pumps, lastQuery);
    showingNearest = Boolean(showNearest);
    renderResults();
  }

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      runSelect(false);
    });
    ['pumpQ', 'pumpH'].forEach((id) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.addEventListener('input', function () {
        fieldError(id, '');
      });
    });
  }

  if (resultsEl) {
    resultsEl.addEventListener('click', function (event) {
      const detail = event.target.closest('[data-pump-detail]');
      if (detail) {
        const pump = listPumps().find((item) => item.id === detail.getAttribute('data-pump-detail'));
        if (pump) openDetail(pump);
        return;
      }
      const compare = event.target.closest('[data-pump-compare]');
      if (compare) {
        const pump = listPumps().find((item) => item.id === compare.getAttribute('data-pump-compare'));
        if (pump) toggleCompare(pump);
        return;
      }
      if (event.target.closest('[data-pump-nearest]')) {
        showingNearest = true;
        renderResults();
        return;
      }
      if (event.target.closest('[data-pump-edit]')) {
        document.getElementById('pumpQ').focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (event.target.closest('[data-pump-consult]')) {
        openRequest([]);
      }
    });
  }

  if (compareBar) {
    compareBar.addEventListener('click', function (event) {
      if (event.target.closest('[data-pump-compare-open]') && selected.length) openCompare();
    });
  }

  if (modalEl) {
    modalEl.addEventListener('click', function (event) {
      if (event.target === modalEl) {
        closeModal();
        return;
      }
      if (event.target.closest('[data-pump-pdf]') && openPump) {
        printPdf(openPump);
        return;
      }
      if (event.target.closest('[data-pump-quote]') && openPump) {
        openRequest(openPump);
      }
    });
  }
  if (modalCloseEl) modalCloseEl.addEventListener('click', closeModal);

  if (compareModal) {
    compareModal.addEventListener('click', function (event) {
      if (event.target === compareModal) {
        closeCompare();
        return;
      }
      if (event.target.closest('[data-pump-consult]')) openRequest(selected.slice());
    });
  }
  if (compareClose) compareClose.addEventListener('click', closeCompare);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (compareModal && compareModal.classList.contains('is-open')) {
      event.preventDefault();
      closeCompare();
      return;
    }
    if (modalEl && modalEl.classList.contains('is-open')) {
      event.preventDefault();
      closeModal();
    }
  });

  dataApi.loadPumpCatalog().then((loaded) => {
    catalog = loaded;
    fillFilters();
  }).catch((err) => {
    if (resultsEl) {
      resultsEl.hidden = false;
      resultsEl.innerHTML = '<p class="catalog-status is-error">' + escapeHtml(err.message || 'Не удалось загрузить данные насосов') + '</p>';
    }
    console.error(err);
  });
})();
