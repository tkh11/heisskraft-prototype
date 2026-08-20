(function () {
  const statusEl = document.getElementById('catalogStatus');
  const gridEl = document.getElementById('productGrid');
  const titleEl = document.getElementById('catalogTitle');
  const leadEl = document.getElementById('catalogLead');

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function productCard(product) {
    return (
      '<article class="product-card" id="' + escapeHtml(product.id) + '">' +
        '<div class="product-card-img">' +
          '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" width="600" height="800" loading="lazy" />' +
        '</div>' +
        '<div class="product-card-body">' +
          '<h2>' + escapeHtml(product.name) + '</h2>' +
          '<p class="product-card-desc">' + escapeHtml(product.description) + '</p>' +
          '<button type="button" class="btn-primary" data-action="details">Подробнее</button>' +
        '</div>' +
      '</article>'
    );
  }

  function render(products) {
    if (!Array.isArray(products) || !products.length) {
      statusEl.textContent = 'В каталоге пока нет товаров.';
      return;
    }

    const category = products[0].category;
    if (category) {
      titleEl.textContent = category;
      leadEl.textContent = 'В линейке ' + products.length + ' моделей. Характеристики ориентировочные, итоговый подбор — по заявке.';
    }

    statusEl.hidden = true;
    gridEl.hidden = false;
    gridEl.innerHTML = products.map(productCard).join('');
  }

  gridEl.addEventListener('click', (event) => {
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
