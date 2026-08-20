(function () {
  function layoutRoot() {
    if (window.Heisskraft && typeof window.Heisskraft.siteRoot === 'function') {
      return window.Heisskraft.siteRoot();
    }
    const script = document.querySelector('script[src*="layout.js"]');
    if (script && script.src) return new URL('../', script.src);
    return new URL('.', window.location.href);
  }

  function loadText(url) {
    if (window.Heisskraft && typeof window.Heisskraft.loadText === 'function') {
      return window.Heisskraft.loadText(url);
    }
    return fetch(new URL(url, layoutRoot())).then((response) => {
      if (!response.ok) throw new Error('Не удалось загрузить ' + url);
      return response.text();
    });
  }

  function loadProducts() {
    if (window.Heisskraft && typeof window.Heisskraft.products === 'function') {
      return window.Heisskraft.products();
    }
    return fetch(new URL('data/products.json', layoutRoot())).then((response) => {
      if (!response.ok) throw new Error('Не удалось загрузить товары');
      return response.json();
    });
  }

  function relocateHeaderOverlays() {
    ['searchModal', 'toast'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) document.body.appendChild(el);
    });
  }

  function loadPartial(selector, url) {
    const host = document.querySelector(selector);
    if (!host) return Promise.resolve();

    function afterInsert() {
      if (selector === '#site-header') relocateHeaderOverlays();
    }

    if (host.childElementCount) {
      afterInsert();
      return Promise.resolve();
    }

    return loadText(url).then((html) => {
      host.innerHTML = html;
      afterInsert();
    }).catch((err) => {
      if (!host.innerHTML.trim()) console.warn(err);
      afterInsert();
    });
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2800);
  }

  window.showToast = showToast;

  function initMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (!menuBtn || !mobileMenu) return;

    function closeMenu() {
      menuBtn.classList.remove('is-open');
      mobileMenu.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Открыть меню');
      document.body.style.overflow = '';
    }

    menuBtn.addEventListener('click', () => {
      const isOpen = menuBtn.classList.toggle('is-open');
      mobileMenu.classList.toggle('is-open', isOpen);
      menuBtn.setAttribute('aria-expanded', isOpen);
      menuBtn.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileMenu.addEventListener('click', (e) => {
      if (e.target === mobileMenu) closeMenu();
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
        closeMenu();
      }
    });
  }

  function initSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchModal = document.getElementById('searchModal');
    const searchInput = document.getElementById('searchInput');
    const searchClose = document.getElementById('searchClose');
    const searchClear = document.getElementById('searchClear');
    const searchForm = document.getElementById('searchForm');
    const searchResults = document.getElementById('searchResults');
    const searchHints = document.getElementById('searchHints');
    const searchLive = document.getElementById('searchLive');
    const pageRoot = document.getElementById('page');
    if (!searchBtn || !searchModal) return;

    let lastFocus = null;
    let activeIndex = -1;

    const pages = [
      { name: 'Насосы и насосные станции', category: 'Каталог', hint: 'Скважинные, циркуляционные и повысительные насосы', href: 'catalog.html?category=pumps', thumb: 'assets/catalog2.jpg' },
      { name: 'Водоснабжение', category: 'Применение', hint: 'Фильтр по сфере применения', href: 'catalog.html?use=water', thumb: 'assets/catalog2.jpg' },
      { name: 'Отопление', category: 'Применение', hint: 'Фильтр по сфере применения', href: 'catalog.html?use=heating', thumb: 'assets/catalog3.jpg' },
      { name: 'Канализация и дренаж', category: 'Каталог', hint: 'Дренажные и фекальные насосы', href: 'catalog.html?category=drainage', thumb: 'assets/catalog4.jpg' },
      { name: 'Пожаротушение', category: 'Каталог', hint: 'Насосы и станции ПТ', href: 'catalog.html?category=fire', thumb: 'assets/catalog5.jpg' },
      { name: 'Водоподготовка', category: 'Каталог', hint: 'Фильтрация и обратный осмос', href: 'catalog.html?category=treatment', thumb: 'assets/catalog6.jpg' },
      { name: 'Полный каталог', category: 'Каталог', hint: 'Вся линейка HEISSKRAFT', href: 'catalog.html', thumb: 'assets/catalog1.jpg' },
      { name: 'Подбор насосов', category: 'Страница', hint: 'Подбор по расходу и напору', href: 'pumps.html', thumb: 'assets/catalog2.jpg' },
      { name: 'Подрядчик', category: 'Профиль', hint: 'Комплектация и поддержка объектов', target: '[data-profile="contractor"]', thumb: 'assets/icon-contractor.svg', icon: true },
      { name: 'Проектировщик', category: 'Профиль', hint: 'BIM, спецификации, гидравлика', target: '[data-profile="designer"]', thumb: 'assets/icon-designer.svg', icon: true },
      { name: 'Частное лицо', category: 'Профиль', hint: 'Системы для частного дома', target: '[data-profile="private"]', thumb: 'assets/icon-private.svg', icon: true },
      { name: 'Партнер', category: 'Профиль', hint: 'Дилерские условия', target: '[data-profile="partner"]', thumb: 'assets/icon-partner.svg', icon: true },
      { name: 'Контакты', category: 'Страница', hint: '+7 (495) 258-45-42 · Пушкино', target: '#footer', thumb: 'assets/phone-icon.svg', icon: true },
      { name: 'Оставить заявку', category: 'Действие', hint: 'Подбор оборудования под объект', action: 'request', thumb: 'assets/logo.svg', icon: true }
    ];

    const categoryLabels = {
      pumps: 'Насосы и насосные станции',
      pipes: 'Трубы и трубопроводные системы',
      fittings: 'Фитинги',
      valves: 'Трубопроводная арматура',
      fire: 'Пожаротушение',
      drainage: 'Канализация и дренаж',
      treatment: 'Водоподготовка',
      pneumatics: 'Пневматика',
      automation: 'Автоматика',
      mounting: 'Монтажное оборудование',
      spares: 'Запчасти и комплектующие'
    };

    const fuseOptions = {
      keys: ['name', 'category', 'hint', 'searchText'],
      threshold: 0.35,
      ignoreLocation: true
    };
    let searchIndex = pages.slice();
    let fuse = typeof Fuse === 'function' ? new Fuse(searchIndex, fuseOptions) : null;
    const popularQueries = ['Отопление', 'Водоснабжение', 'HMH', 'Контакты'];
    const popularNames = ['Водоснабжение', 'Отопление', 'Контакты', 'Оставить заявку'];
    let currentMatches = searchIndex.slice();

    function normalize(s) {
      return (s || '').toLowerCase().replace(/ё/g, 'е').trim();
    }

    function plural(n, one, few, many) {
      const m10 = n % 10;
      const m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return one;
      if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
      return many;
    }

    function escapeHtml(s) {
      return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function filterIndex(query) {
      const q = query.trim();
      if (!q) return searchIndex.filter((item) => popularNames.includes(item.name));
      if (fuse) return fuse.search(q).map((result) => result.item);
      const needle = q.toLowerCase().replace(/ё/g, 'е');
      return searchIndex.filter((item) => {
        const haystack = [item.name, item.category, item.hint, item.searchText].join(' ').toLowerCase().replace(/ё/g, 'е');
        return haystack.includes(needle);
      });
    }

    function renderHints() {
      searchHints.innerHTML = popularQueries.map((q) => (
        '<button type="button" class="search-chip" data-query="' + q + '">' + q + '</button>'
      )).join('');
    }

    function renderResults(query) {
      const q = query.trim();
      currentMatches = filterIndex(q);
      searchClear.classList.toggle('is-visible', q.length > 0);
      activeIndex = currentMatches.length ? 0 : -1;

      Array.from(searchHints.children).forEach((chip, i) => {
        chip.setAttribute('aria-pressed', String(normalize(q) === normalize(popularQueries[i])));
      });

      if (!currentMatches.length) {
        searchResults.innerHTML =
          '<div class="search-empty">' +
            '<h3>Ничего не найдено</h3>' +
            '<p>По запросу «' + escapeHtml(q) + '» нет разделов и товаров. Оставьте заявку — подберём оборудование.</p>' +
            '<button type="button" class="btn-primary" id="searchEmptyCta">Оставить заявку</button>' +
          '</div>';
        searchInput.removeAttribute('aria-activedescendant');
        searchLive.textContent = 'Нет результатов';
        return;
      }

      const heading = q ? 'Результаты' : 'Популярные разделы';
      searchResults.innerHTML = '<div class="search-group-label" id="searchResultsLabel">' + heading + '</div>' +
        currentMatches.map((item, i) => (
          '<button type="button" class="search-item' + (i === 0 ? ' is-active' : '') + '" role="option" tabindex="-1" id="search-opt-' + i + '" data-index="' + i + '" aria-selected="' + (i === 0) + '">' +
            '<span class="search-item-thumb' + (item.icon ? ' is-icon' : '') + '"><img src="' + item.thumb + '" alt="" width="48" height="48" loading="lazy"></span>' +
            '<span class="search-item-text"><strong>' + escapeHtml(item.name) + '</strong><span class="search-item-hint' + (item.category === 'Товар' ? ' is-clamped' : '') + '">' + escapeHtml(item.hint) + '</span></span>' +
            '<span class="search-item-type">' + escapeHtml(item.category) + '</span>' +
          '</button>'
        )).join('');

      searchInput.setAttribute('aria-activedescendant', 'search-opt-0');
      searchLive.textContent = q
        ? currentMatches.length + ' ' + plural(currentMatches.length, 'результат', 'результата', 'результатов')
        : 'Показаны популярные разделы';
    }

    function setActive(index) {
      const items = searchResults.querySelectorAll('.search-item');
      items.forEach((el) => {
        el.classList.remove('is-active');
        el.setAttribute('aria-selected', 'false');
      });
      if (index < 0 || !items[index]) {
        activeIndex = -1;
        searchInput.removeAttribute('aria-activedescendant');
        return;
      }
      activeIndex = index;
      items[index].classList.add('is-active');
      items[index].setAttribute('aria-selected', 'true');
      searchInput.setAttribute('aria-activedescendant', items[index].id);
      items[index].scrollIntoView({ block: 'nearest' });
    }

    function highlightTarget(selector) {
      document.querySelectorAll('.is-highlighted').forEach((el) => el.classList.remove('is-highlighted'));
      const el = document.querySelector(selector);
      if (!el) {
        if (selector.startsWith('#')) window.location.href = 'index.html' + selector;
        else window.location.href = 'index.html';
        return;
      }
      el.classList.add('is-highlighted');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => el.classList.remove('is-highlighted'), 2400);
    }

    function openSearch() {
      lastFocus = document.activeElement;
      searchModal.classList.add('is-open');
      searchModal.setAttribute('aria-hidden', 'false');
      searchBtn.setAttribute('aria-expanded', 'true');
      if (pageRoot) {
        pageRoot.setAttribute('inert', '');
        pageRoot.setAttribute('aria-hidden', 'true');
      }
      document.body.style.overflow = 'hidden';
      renderHints();
      renderResults(searchInput.value);
      window.setTimeout(() => searchInput.focus(), 40);
    }

    function closeSearch() {
      if (!searchModal.classList.contains('is-open')) return;
      searchModal.classList.remove('is-open');
      searchModal.setAttribute('aria-hidden', 'true');
      searchBtn.setAttribute('aria-expanded', 'false');
      if (pageRoot) {
        pageRoot.removeAttribute('inert');
        pageRoot.removeAttribute('aria-hidden');
      }
      activeIndex = -1;
      const mobileMenu = document.getElementById('mobileMenu');
      if (!mobileMenu || !mobileMenu.classList.contains('is-open')) document.body.style.overflow = '';
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    function openResult(item) {
      closeSearch();
      if (item.action === 'request') {
        if (window.openRequestForm) window.openRequestForm();
        else if (window.showToast) window.showToast('Форма заявки — скоро появится');
        return;
      }
      if (item.href) {
        window.location.href = item.href;
        return;
      }
      if (item.target) highlightTarget(item.target);
    }

    searchBtn.addEventListener('click', openSearch);
    searchClose.addEventListener('click', closeSearch);
    searchModal.addEventListener('click', (e) => {
      if (e.target === searchModal) closeSearch();
    });
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      renderResults('');
      searchInput.focus();
    });
    searchInput.addEventListener('input', () => renderResults(searchInput.value));
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (activeIndex >= 0 && currentMatches[activeIndex]) openResult(currentMatches[activeIndex]);
    });
    searchHints.addEventListener('click', (e) => {
      const chip = e.target.closest('.search-chip');
      if (!chip) return;
      searchInput.value = chip.dataset.query;
      renderResults(searchInput.value);
      searchInput.focus();
    });
    searchResults.addEventListener('click', (e) => {
      const emptyCta = e.target.closest('#searchEmptyCta');
      if (emptyCta) {
        closeSearch();
        if (window.openRequestForm) window.openRequestForm();
        else if (window.showToast) window.showToast('Форма заявки — скоро появится');
        return;
      }
      const itemEl = e.target.closest('.search-item');
      if (!itemEl) return;
      openResult(currentMatches[Number(itemEl.dataset.index)]);
    });
    searchResults.addEventListener('mousemove', (e) => {
      const itemEl = e.target.closest('.search-item');
      if (!itemEl) return;
      setActive(Number(itemEl.dataset.index));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchModal.classList.contains('is-open')) {
        e.preventDefault();
        closeSearch();
        return;
      }
      if (!searchModal.classList.contains('is-open')) return;
      const focusable = searchModal.querySelectorAll('button:not([tabindex="-1"]), [href], input');
      const list = Array.from(focusable).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
      if (e.key === 'Tab' && list.length) {
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!currentMatches.length) return;
        setActive((activeIndex + 1) % currentMatches.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!currentMatches.length) return;
        setActive((activeIndex - 1 + currentMatches.length) % currentMatches.length);
      }
    });

    function rebuildFuse() {
      if (typeof Fuse === 'function') fuse = new Fuse(searchIndex, fuseOptions);
    }

    loadProducts()
      .then((catalogProducts) => {
        if (!Array.isArray(catalogProducts)) return;
        const catalogItems = catalogProducts.map((product) => {
          const section = categoryLabels[product.category] || 'Каталог';
          const specText = product.specs && typeof product.specs === 'object'
            ? Object.values(product.specs).join(' ')
            : '';
          return {
            name: product.name,
            category: 'Товар',
            hint: product.description || section,
            href: 'catalog.html?category=' + encodeURIComponent(product.category) + '#' + encodeURIComponent(product.id),
            thumb: product.image,
            searchText: [product.name, product.series, product.sku, product.id, section, product.description, specText].join(' ')
          };
        });
        searchIndex = pages.concat(catalogItems);
        rebuildFuse();
        if (searchModal.classList.contains('is-open')) renderResults(searchInput.value);
      })
      .catch((err) => {
        console.warn(err);
      });

    if (typeof Fuse !== 'function' && window.Heisskraft && typeof window.Heisskraft.loadFuse === 'function') {
      window.Heisskraft.loadFuse().then(rebuildFuse).catch(() => {});
    }
  }

  function initActions() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const action = el.dataset.action;
      if (action === 'request') {
        e.preventDefault();
        if (window.openRequestForm) window.openRequestForm();
        else showToast('Форма заявки — скоро появится');
        return;
      }
      const messages = {
        about: 'Страница «О компании» — в разработке',
        requisites: 'Реквизиты организации — в разработке',
        docs: 'Раздел «Документация» — в разработке',
        privacy: 'Политика конфиденциальности — в разработке',
        personal: 'Обработка персональных данных — в разработке'
      };
      const message = messages[action];
      if (!message) return;
      e.preventDefault();
      showToast(message);
    });
  }

  function pageFileName(path) {
    let name = String(path || '').split('?')[0].split('#')[0].replace(/\/+$/, '');
    name = name.split('/').pop();
    if (!name) return 'index.html';
    if (name.indexOf('.') === -1) name += '.html';
    return name;
  }

  function markCurrentNav() {
    const pageFile = pageFileName(window.location.pathname);
    if (pageFile === 'pumps.html') document.body.classList.add('is-pumps-page');
    document.querySelectorAll('.header-nav a[href], .mobile-menu-nav a[href]').forEach((link) => {
      const href = pageFileName(link.getAttribute('href') || '');
      if (href && href === pageFile) link.setAttribute('aria-current', 'page');
    });
  }

  function initChrome() {
    initMenu();
    initSearch();
    initActions();
    markCurrentNav();
    if (window.Heisskraft && typeof window.Heisskraft.markLayoutReady === 'function') {
      window.Heisskraft.markLayoutReady();
    } else {
      document.dispatchEvent(new CustomEvent('layout:ready'));
    }
  }

  function loadLayout() {
    const headerHost = document.querySelector('#site-header');
    const footerHost = document.querySelector('#site-footer');
    const hasHeader = !headerHost || headerHost.childElementCount > 0;
    const hasFooter = !footerHost || footerHost.childElementCount > 0;

    if (hasHeader && hasFooter) {
      if (headerHost) relocateHeaderOverlays();
      initChrome();
      return;
    }

    Promise.all([
      loadPartial('#site-header', 'header.html'),
      loadPartial('#site-footer', 'footer.html')
    ]).then(initChrome);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLayout);
  } else {
    loadLayout();
  }
})();
