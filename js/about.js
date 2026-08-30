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
  const slides = gallery ? Array.from(gallery.querySelectorAll('.about-shot')) : [];
  let galleryIndex = 0;
  let setGalleryIndex = function () {};

  if (gallery) {
    const media = gallery.querySelector('.about-gallery-media');
    const prevBtn = gallery.querySelector('[data-gallery-prev]');
    const nextBtn = gallery.querySelector('[data-gallery-next]');
    const dotsRoot = gallery.querySelector('.about-gallery-dots');
    const total = slides.length;
    let touchX = null;
    let dragged = false;

    slides.forEach((slide, i) => {
      const label = slide.querySelector('span');
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', label ? label.textContent : 'Кадр ' + (i + 1));
      if (i === 0) dot.classList.add('is-active');
      dot.addEventListener('click', () => setGalleryIndex(i));
      if (dotsRoot) dotsRoot.appendChild(dot);
    });

    const dots = Array.from(gallery.querySelectorAll('.about-gallery-dots button'));

    setGalleryIndex = function (next) {
      if (!total) return;
      galleryIndex = (next + total) % total;
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === galleryIndex));
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === galleryIndex));
    };

    if (prevBtn) prevBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      setGalleryIndex(galleryIndex - 1);
    });
    if (nextBtn) nextBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      setGalleryIndex(galleryIndex + 1);
    });

    gallery.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setGalleryIndex(galleryIndex - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setGalleryIndex(galleryIndex + 1);
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
      setGalleryIndex(galleryIndex + (dx < 0 ? 1 : -1));
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

    slides.forEach((slide, i) => {
      slide.addEventListener('click', function (event) {
        if (!dragged) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        dragged = false;
      });
    });
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
  const lightboxItems = slides.map((slide) => {
    const img = slide.querySelector('img');
    return {
      src: slide.dataset.lightbox || (img && img.src) || '',
      caption: slide.dataset.caption || '',
      alt: (img && img.alt) || slide.dataset.caption || ''
    };
  });
  let lightboxIndex = 0;
  let lightboxTouchX = null;

  function isLightboxOpen() {
    return lightbox && !lightbox.hidden;
  }

  function renderLightbox() {
    if (!lightboxItems.length || !lightboxImage) return;
    lightboxIndex = (lightboxIndex + lightboxItems.length) % lightboxItems.length;
    const item = lightboxItems[lightboxIndex];
    lightboxImage.src = item.src;
    lightboxImage.alt = item.alt;
    if (lightboxCaption) lightboxCaption.textContent = item.caption;
    setGalleryIndex(lightboxIndex);
  }

  function stepLightbox(delta) {
    if (!lightboxItems.length) return;
    lightboxIndex = (lightboxIndex + delta + lightboxItems.length) % lightboxItems.length;
    renderLightbox();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }

  function openLightbox(index) {
    if (!lightbox || !lightboxItems.length) return;
    lightboxIndex = index;
    renderLightbox();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    if (lightboxClose) lightboxClose.focus();
  }

  slides.forEach((slide, i) => {
    slide.addEventListener('click', function () {
      openLightbox(i);
    });
  });

  if (lightboxClose) {
    lightboxClose.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      closeLightbox();
    });
  }

  if (lightbox) {
    lightbox.addEventListener('click', function (event) {
      if (event.target.closest('.about-lightbox-close')) {
        event.preventDefault();
        event.stopPropagation();
        closeLightbox();
        return;
      }
      const nav = event.target.closest('.about-lightbox-nav');
      if (nav) {
        event.preventDefault();
        event.stopPropagation();
        stepLightbox(nav.classList.contains('is-next') ? 1 : -1);
        return;
      }
      if (event.target === lightbox) closeLightbox();
    });
    lightbox.addEventListener('touchstart', function (event) {
      if (event.target.closest('button')) {
        lightboxTouchX = null;
        return;
      }
      lightboxTouchX = event.changedTouches[0].clientX;
    }, { passive: true });
    lightbox.addEventListener('touchend', function (event) {
      if (event.target.closest('button') || lightboxTouchX == null) return;
      const dx = event.changedTouches[0].clientX - lightboxTouchX;
      lightboxTouchX = null;
      if (Math.abs(dx) < 40) return;
      stepLightbox(dx < 0 ? 1 : -1);
    }, { passive: true });
  }
  document.addEventListener('keydown', function (event) {
    if (!isLightboxOpen()) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepLightbox(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepLightbox(1);
    }
  });
})();
