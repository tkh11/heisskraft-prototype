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

  const banner = document.querySelector('.warranty-banner video');
  if (!banner) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    banner.removeAttribute('autoplay');
    banner.pause();
    return;
  }

  banner.muted = true;
  banner.loop = true;

  function playBanner() {
    const play = banner.play();
    if (play) play.catch(() => {});
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach((entry) => {
        if (entry.isIntersecting) playBanner();
        else banner.pause();
      });
    }, { threshold: 0.25 });
    observer.observe(banner);
  } else {
    playBanner();
  }
})();
