(function () {
  function layoutRoot() {
    const script = document.querySelector('script[src*="layout.js"]');
    if (script && script.src) return new URL('../', script.src);
    return new URL('.', window.location.href);
  }

  async function loadPartial(selector, url) {
    const host = document.querySelector(selector);
    if (!host) return;
    try {
      const response = await fetch(new URL(url, layoutRoot()));
      if (!response.ok) throw new Error('Не удалось загрузить ' + url);
      host.innerHTML = await response.text();
    } catch (err) {
      if (!host.innerHTML.trim()) {
        console.warn(err);
      }
    }
    if (selector === '#site-header') {
      ['searchModal', 'toast'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) document.body.appendChild(el);
      });
    }
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

    const products = [
      { name: 'Водоснабжение', category: 'Каталог', hint: 'Насосы и станции для воды', target: '[data-category="water"]', thumb: 'assets/catalog2.jpg' },
      { name: 'Отопление', category: 'Каталог', hint: 'Циркуляционные насосы', target: '[data-category="heating"]', thumb: 'assets/catalog3.jpg' },
      { name: 'Канализация / Дренаж', category: 'Каталог', hint: 'Дренажные и фекальные насосы', target: '[data-category="drainage"]', thumb: 'assets/catalog4.jpg' },
      { name: 'Пожаротушение', category: 'Каталог', hint: 'Насосные станции ПТ', target: '[data-category="fire"]', thumb: 'assets/catalog5.jpg' },
      { name: 'Водоподготовка', category: 'Каталог', hint: 'Фильтрация и подготовка воды', target: '[data-category="treatment"]', thumb: 'assets/catalog6.jpg' },
      { name: 'Полный каталог', category: 'Каталог', hint: 'Вся линейка HEISSKRAFT', target: '[data-category="full"]', thumb: 'assets/catalog1.jpg' },
      { name: 'Подрядчик', category: 'Профиль', hint: 'Комплектация и поддержка объектов', target: '[data-profile="contractor"]', thumb: 'assets/icon-contractor.svg', icon: true },
      { name: 'Проектировщик', category: 'Профиль', hint: 'BIM, спецификации, гидравлика', target: '[data-profile="designer"]', thumb: 'assets/icon-designer.svg', icon: true },
      { name: 'Частное лицо', category: 'Профиль', hint: 'Системы для частного дома', target: '[data-profile="private"]', thumb: 'assets/icon-private.svg', icon: true },
      { name: 'Партнер', category: 'Профиль', hint: 'Дилерские условия', target: '[data-profile="partner"]', thumb: 'assets/icon-partner.svg', icon: true },
      { name: 'Контакты', category: 'Страница', hint: '+7 (495) 258-45-42 · Пушкино', target: '#footer', thumb: 'assets/phone-icon.svg', icon: true },
      { name: 'Оставить заявку', category: 'Действие', hint: 'Подбор оборудования под объект', action: 'request', thumb: 'assets/logo.svg', icon: true }
    ];

    const fuse = typeof Fuse === 'function' ? new Fuse(products, { keys: ['name', 'category'] }) : null;
    const popularQueries = ['Отопление', 'Водоснабжение', 'Контакты', 'Подрядчик'];
    const popularNames = ['Водоснабжение', 'Отопление', 'Контакты', 'Оставить заявку'];
    let currentMatches = products.slice();

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
      if (!q) return products.filter((item) => popularNames.includes(item.name));
      if (fuse) return fuse.search(q).map((result) => result.item);
      const needle = q.toLowerCase().replace(/ё/g, 'е');
      return products.filter((item) => (item.name + ' ' + item.category).toLowerCase().replace(/ё/g, 'е').includes(needle));
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
            '<p>По запросу «' + escapeHtml(q) + '» нет разделов. Оставьте заявку — подберём оборудование.</p>' +
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
            '<span class="search-item-thumb' + (item.icon ? ' is-icon' : '') + '"><img src="' + item.thumb + '" alt=""></span>' +
            '<span class="search-item-text"><strong>' + item.name + '</strong><span>' + item.hint + '</span></span>' +
            '<span class="search-item-type">' + item.category + '</span>' +
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
        const requestLink = document.querySelector('[data-action="request"]');
        if (requestLink) requestLink.click();
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
        const requestLink = document.querySelector('[data-action="request"]');
        if (requestLink) requestLink.click();
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
  }

  function initActions() {
    document.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const messages = {
          about: 'Страница «О компании» — в разработке',
          requisites: 'Реквизиты организации — в разработке',
          docs: 'Раздел «Документация» — в разработке',
          pumps: 'Подбор насосов — в разработке',
          request: 'Форма заявки — скоро появится',
          privacy: 'Политика конфиденциальности — в разработке',
          personal: 'Обработка персональных данных — в разработке'
        };
        showToast(messages[el.dataset.action] || 'Раздел в разработке');
      });
    });
  }

  async function loadLayout() {
    await Promise.all([
      loadPartial('#site-header', 'header.html'),
      loadPartial('#site-footer', 'footer.html')
    ]);
    initMenu();
    initSearch();
    initActions();
    document.dispatchEvent(new CustomEvent('layout:ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLayout);
  } else {
    loadLayout();
  }
})();
