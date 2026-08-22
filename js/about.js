(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const card = document.getElementById('aboutCard');
  if (card) {
    card.addEventListener('click', function () {
      const on = card.getAttribute('aria-pressed') === 'true';
      card.setAttribute('aria-pressed', on ? 'false' : 'true');
      card.classList.toggle('is-flipped', !on);
    });
  }

  const stats = Array.from(document.querySelectorAll('.about-stat-value[data-count]'));
  function animateCount(el) {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (reduceMotion) {
      el.textContent = target + suffix;
      return;
    }
    const start = performance.now();
    const duration = 1100;
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (stats.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    stats.forEach((el) => observer.observe(el));
  } else {
    stats.forEach(animateCount);
  }

  const pathRoot = document.getElementById('aboutPath');
  if (pathRoot) {
    const tabs = Array.from(pathRoot.querySelectorAll('[role="tab"]'));
    const panels = Array.from(pathRoot.querySelectorAll('.about-path-panel'));
    const shots = Array.from(pathRoot.querySelectorAll('.about-path-shot'));

    function showPath(index) {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach((panel, i) => {
        const on = i === index;
        panel.classList.toggle('is-active', on);
        panel.hidden = !on;
      });
      shots.forEach((shot, i) => {
        shot.classList.toggle('is-active', i === index);
        const video = shot.querySelector('video');
        if (!video) return;
        if (i === index) {
          const play = video.play();
          if (play) play.catch(() => {});
        } else {
          video.pause();
        }
      });
    }

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => showPath(i));
    });
  }

  const videos = Array.from(document.querySelectorAll('.about-hero-media video, .about-shot video'));
  if ('IntersectionObserver' in window) {
    const mediaObserver = new IntersectionObserver(function (entries) {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          const play = video.play();
          if (play) play.catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.35 });
    videos.forEach((video) => mediaObserver.observe(video));
  }

  const lightbox = document.getElementById('aboutLightbox');
  const lightboxImage = document.getElementById('aboutLightboxImage');
  const lightboxCaption = document.getElementById('aboutLightboxCaption');
  const lightboxClose = document.getElementById('aboutLightboxClose');

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }

  function openLightbox(src, caption, alt) {
    if (!lightbox || !lightboxImage) return;
    lightboxImage.src = src;
    lightboxImage.alt = alt || caption || '';
    if (lightboxCaption) lightboxCaption.textContent = caption || '';
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    if (lightboxClose) lightboxClose.focus();
  }

  document.querySelectorAll('[data-lightbox]').forEach((btn) => {
    btn.addEventListener('click', function () {
      openLightbox(btn.dataset.lightbox, btn.dataset.caption, btn.querySelector('img') && btn.querySelector('img').alt);
    });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', function (event) {
      if (event.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && lightbox && !lightbox.hidden) closeLightbox();
  });
})();
