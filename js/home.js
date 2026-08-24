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

  const industries = document.getElementById('industries');
  if (industries) {
    const moreBtn = document.getElementById('industriesMore');
    const closeBtn = document.getElementById('industriesClose');
    const extra = industries.querySelector('.industries-extra');
    const extraCards = extra ? extra.querySelectorAll('.catalog-card').length : 0;
    const mobileMq = window.matchMedia('(max-width: 640px)');
    let expanded = false;

    function isMobile() {
      return mobileMq.matches;
    }

    function renderMore() {
      const mobile = isMobile();
      industries.classList.toggle('is-expanded', mobile && expanded);
      if (moreBtn) moreBtn.hidden = !mobile || extraCards === 0 || expanded;
      if (closeBtn) closeBtn.hidden = !mobile || extraCards === 0 || !expanded;
    }

    if (moreBtn) {
      moreBtn.addEventListener('click', () => {
        expanded = true;
        renderMore();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        expanded = false;
        renderMore();
        if (typeof industries.scrollIntoView === 'function') {
          industries.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    if (typeof mobileMq.addEventListener === 'function') {
      mobileMq.addEventListener('change', () => {
        if (!isMobile()) expanded = false;
        renderMore();
      });
    } else if (typeof mobileMq.addListener === 'function') {
      mobileMq.addListener(renderMore);
    }

    renderMore();
  }

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
