(function () {
  document.querySelectorAll('.profile-card').forEach((card) => {
    if (card.tagName === 'A' && card.getAttribute('href') && card.getAttribute('href') !== '#') return;
    card.addEventListener('click', () => {
      const name = card.querySelector('h3').textContent;
      if (window.showToast) window.showToast('Раздел «' + name + '» — скоро будет доступен');
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
})();
