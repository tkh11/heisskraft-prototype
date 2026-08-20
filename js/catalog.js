(function () {
  const CATEGORIES = [
    {
      id: 'full',
      name: 'Полный каталог',
      lead: 'Вся линейка насосного оборудования HEISSKRAFT: водоснабжение, отопление, канализация, пожаротушение и водоподготовка.'
    },
    {
      id: 'water',
      name: 'Водоснабжение',
      lead: 'Насосы и станции для хозяйственно-питьевого водоснабжения и повышения давления.'
    },
    {
      id: 'heating',
      name: 'Отопление',
      lead: 'Циркуляционные насосы для систем отопления, ИТП и теплоснабжения.'
    },
    {
      id: 'drainage',
      name: 'Канализация / Дренаж',
      lead: 'Дренажные и фекальные насосы для откачки воды, септиков и КНС.'
    },
    {
      id: 'fire',
      name: 'Пожаротушение',
      lead: 'Насосы и станции для систем водяного пожаротушения.'
    },
    {
      id: 'treatment',
      name: 'Водоподготовка',
      lead: 'Фильтрация и установки подготовки воды для частных и коммерческих объектов.'
    }
  ];

  const statusEl = document.getElementById('catalogStatus');
  const contentEl = document.getElementById('catalogContent');
  const titleEl = document.getElementById('catalogTitle');
  const leadEl = document.getElementById('catalogLead');
  const breadcrumbEl = document.getElementById('catalogCurrent');
  const navEl = document.getElementById('catalogSections');

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function currentCategory() {
    const id = new URLSearchParams(window.location.search).get('category') || 'full';
    return CATEGORIES.some((item) => item.id === id) ? id : 'full';
  }

  function categoryMeta(id) {
    return CATEGORIES.find((item) => item.id === id) || CATEGORIES[0];
  }

  function categoryHref(id) {
    return id === 'full' ? 'catalog.html' : 'catalog.html?category=' + encodeURIComponent(id);
  }

  function productCard(product) {
    return (
      '<article class="product-card" id="' + escapeHtml(product.id) + '">' +
        '<div class="product-card-img">' +
          '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" width="600" height="800" loading="lazy" />' +
        '</div>' +
        '<div class="product-card-body">' +
          '<h3>' + escapeHtml(product.name) + '</h3>' +
          '<p class="product-card-desc">' + escapeHtml(product.description) + '</p>' +
          '<button type="button" class="btn-primary" data-action="details">Подробнее</button>' +
        '</div>' +
      '</article>'
    );
  }

  function productGrid(products) {
    return '<div class="product-grid">' + products.map(productCard).join('') + '</div>';
  }

  function renderNav(activeId) {
    navEl.innerHTML = CATEGORIES.map((item) => (
      '<a href="' + categoryHref(item.id) + '" class="' + (item.id === activeId ? 'is-active' : '') + '"' +
        (item.id === activeId ? ' aria-current="page"' : '') + '>' +
        escapeHtml(item.name) +
      '</a>'
    )).join('');
  }

  function render(products) {
    const list = Array.isArray(products) ? products : [];
    const activeId = currentCategory();
    const meta = categoryMeta(activeId);

    titleEl.textContent = meta.name;
    leadEl.textContent = meta.lead;
    breadcrumbEl.textContent = meta.name;
    document.title = meta.name + ' — HEISSKRAFT';
    renderNav(activeId);

    statusEl.hidden = true;
    contentEl.hidden = false;

    if (!list.length) {
      contentEl.innerHTML = '<p class="catalog-status">В каталоге пока нет товаров.</p>';
      return;
    }

    const items = activeId === 'full'
      ? list
      : list.filter((product) => product.category === activeId);

    contentEl.innerHTML = items.length
      ? productGrid(items)
      : '<p class="catalog-status">В этом разделе пока нет товаров.</p>';
  }

  contentEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="details"]');
    if (!button) return;
    if (window.showToast) window.showToast('Страница товара — в разработке');
  });

  fetch('data/products.json')
    .then((response) => {
      if (!response.ok) throw new Error('Не удалось загрузить каталог');
      return response.json();
    })
    .then(render)
    .catch((err) => {
      statusEl.classList.add('is-error');
      statusEl.textContent = err.message || 'Не удалось загрузить каталог';
    });
})();
