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

  const gallery = document.getElementById('aboutGallery');
  if (gallery) {
    const slides = Array.from(gallery.querySelectorAll('.about-shot'));
    const media = gallery.querySelector('.about-gallery-media');
    const prevBtn = gallery.querySelector('[data-gallery-prev]');
    const nextBtn = gallery.querySelector('[data-gallery-next]');
    const dotsRoot = gallery.querySelector('.about-gallery-dots');
    const total = slides.length;
    let index = 0;
    let touchX = null;
    let dragged = false;

    slides.forEach((slide, i) => {
      const label = slide.querySelector('span');
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', label ? label.textContent : 'Кадр ' + (i + 1));
      if (i === 0) dot.classList.add('is-active');
      dot.addEventListener('click', () => go(i));
      if (dotsRoot) dotsRoot.appendChild(dot);
    });

    const dots = Array.from(gallery.querySelectorAll('.about-gallery-dots button'));

    function syncVideos() {
      slides.forEach((slide, i) => {
        const video = slide.querySelector('video');
        if (!video) return;
        if (i === index) {
          const play = video.play();
          if (play) play.catch(() => {});
        } else {
          video.pause();
        }
      });
    }

    function go(next) {
      if (!total) return;
      index = (next + total) % total;
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
      syncVideos();
    }

    if (prevBtn) prevBtn.addEventListener('click', () => go(index - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => go(index + 1));

    gallery.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(index - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(index + 1);
      }
    });

    function onPointerStart(clientX) {
      touchX = clientX;
      dragged = false;
    }

    function onPointerEnd(clientX) {
      if (touchX == null) return;
      const dx = clientX - touchX;
      touchX = null;
      if (Math.abs(dx) < 40) return;
      dragged = true;
      go(index + (dx < 0 ? 1 : -1));
    }

    if (media) {
      media.addEventListener('touchstart', (event) => onPointerStart(event.changedTouches[0].clientX), { passive: true });
      media.addEventListener('touchend', (event) => onPointerEnd(event.changedTouches[0].clientX), { passive: true });
      media.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'touch') return;
        onPointerStart(event.clientX);
      });
      media.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'touch') return;
        onPointerEnd(event.clientX);
      });
    }

    gallery.querySelectorAll('[data-lightbox]').forEach((btn) => {
      btn.addEventListener('click', function (event) {
        if (!dragged) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        dragged = false;
      });
    });

    if ('IntersectionObserver' in window && media) {
      const galleryObserver = new IntersectionObserver(function (entries) {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            syncVideos();
            return;
          }
          slides.forEach((slide) => {
            const video = slide.querySelector('video');
            if (video) video.pause();
          });
        });
      }, { threshold: 0.35 });
      galleryObserver.observe(media);
    }
  }

  const videos = Array.from(document.querySelectorAll('.about-hero-media video'));
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
