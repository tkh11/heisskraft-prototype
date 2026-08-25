(function initHeroSlider() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const allSlides = Array.from(hero.querySelectorAll('.hero-slide'));
  const allTitles = Array.from(hero.querySelectorAll('.hero-titles .hero-title'));
  const dotsRoot = hero.querySelector('.hero-dots');
  const videos = Array.from(hero.querySelectorAll('video'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileMq = window.matchMedia('(max-width: 640px)');
  const queues = {
    desktop: ['market', 'lakhta', 'production'],
    mobile: ['market', 'lakhta', 'production', 'warranty']
  };
  let queue = [];
  let index = 0;
  let timer = null;
  let inView = false;
  const swipeMin = 40;
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeAxis = null;

  function currentQueue() {
    return mobileMq.matches ? queues.mobile : queues.desktop;
  }

  function videoAllowed(video) {
    const slide = video.closest('.hero-slide');
    if (slide && queue.length && !queue.includes(slide.dataset.slide)) return false;
    if (video.classList.contains('hero-media-desktop')) return !mobileMq.matches;
    if (video.classList.contains('hero-media-mobile')) return mobileMq.matches;
    return true;
  }

  function attachVideo(video, preload) {
    let changed = false;
    video.querySelectorAll('source[data-src]').forEach((source) => {
      const url = source.getAttribute('data-src');
      if (source.getAttribute('src') !== url) {
        source.setAttribute('src', url);
        changed = true;
      }
    });
    video.preload = preload;
    if (changed) video.load();
  }

  function detachVideo(video) {
    let changed = false;
    video.pause();
    video.querySelectorAll('source[data-src]').forEach((source) => {
      if (source.hasAttribute('src')) {
        source.removeAttribute('src');
        changed = true;
      }
    });
    if (changed) {
      video.removeAttribute('src');
      video.load();
    }
  }

  function nextQueuedVideoSlideId() {
    for (let step = 1; step < queue.length; step++) {
      const id = queue[(index + step) % queue.length];
      const slide = allSlides.find((item) => item.dataset.slide === id);
      if (!slide) continue;
      const hasVideo = Array.from(slide.querySelectorAll('video')).some(videoAllowed);
      if (hasVideo) return id;
    }
    return null;
  }

  function measureInView() {
    const rect = hero.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    return visible > 0 && visible >= Math.min(rect.height, vh) * 0.25;
  }

  function syncMedia() {
    const activeId = queue[index];
    const nextId = inView ? nextQueuedVideoSlideId() : null;

    videos.forEach((video) => {
      const slide = video.closest('.hero-slide');
      const slideId = slide && slide.dataset.slide;
      const allowed = videoAllowed(video);
      const isActive = allowed && slideId === activeId;
      const isNext = allowed && nextId && slideId === nextId && slideId !== activeId;

      if (!allowed) {
        detachVideo(video);
        return;
      }

      if (isActive) {
        attachVideo(video, inView ? 'auto' : 'metadata');
        if (inView) {
          video.muted = true;
          video.loop = true;
          const replay = function () {
            const play = video.play();
            if (play) play.catch(() => {});
          };
          if (video.readyState >= 2) replay();
          else video.addEventListener('canplay', replay, { once: true });
        } else {
          video.pause();
        }
        return;
      }

      video.pause();
      if (isNext) {
        attachVideo(video, 'metadata');
        return;
      }

      video.preload = 'none';
      if (!video.querySelector('source[src]')) return;
      try { video.currentTime = 0; } catch (err) {}
    });
  }

  function go(next) {
    if (!queue.length) return;
    index = (next + queue.length) % queue.length;
    const activeId = queue[index];
    allSlides.forEach((slide) => {
      slide.classList.toggle('is-active', slide.dataset.slide === activeId);
    });
    allTitles.forEach((title) => {
      title.classList.toggle('is-active', title.dataset.slide === activeId);
    });
    Array.from(dotsRoot.querySelectorAll('button')).forEach((dot, i) => {
      const on = i === index;
      dot.classList.toggle('is-active', on);
      if (on) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    syncMedia();
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    stop();
    if (reduceMotion || !inView || queue.length < 2) return;
    timer = setInterval(() => go(index + 1), 5000);
  }

  function applySet() {
    queue = currentQueue();
    allSlides.forEach((slide) => {
      slide.classList.toggle('is-disabled', !queue.includes(slide.dataset.slide));
    });
    dotsRoot.innerHTML = queue.map((_, i) => (
      '<button type="button" aria-label="Слайд ' + (i + 1) + '"' +
      (i === 0 ? ' class="is-active" aria-current="true"' : '') +
      '></button>'
    )).join('');
    dotsRoot.querySelectorAll('button').forEach((dot, i) => {
      dot.addEventListener('click', () => {
        go(i);
        start();
      });
    });
    go(0);
    start();
  }

  function setInView(next) {
    const was = inView;
    inView = next;
    if (inView) {
      syncMedia();
      if (!was) start();
    } else {
      stop();
      videos.forEach((video) => video.pause());
    }
  }

  if (typeof mobileMq.addEventListener === 'function') {
    mobileMq.addEventListener('change', applySet);
  } else if (typeof mobileMq.addListener === 'function') {
    mobileMq.addListener(applySet);
  }

  const mediaRoot = hero.querySelector('.hero-slides');
  let swipeOn = false;

  function swipeTargetBlocked(target) {
    return Boolean(target.closest('a, button, input, textarea, select, label'));
  }

  function resetSwipe() {
    swipeOn = false;
    swipeAxis = null;
  }

  function beginSwipe(x, y, target) {
    if (!mobileMq.matches || swipeTargetBlocked(target)) return;
    swipeOn = true;
    swipeStartX = x;
    swipeStartY = y;
    swipeAxis = null;
  }

  function trackSwipe(x, y) {
    if (!swipeOn) return;
    const dx = x - swipeStartX;
    const dy = y - swipeStartY;
    if (!swipeAxis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      swipeAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
  }

  function finishSwipe(x, y) {
    if (!swipeOn) return;
    const dx = x - swipeStartX;
    const dy = y - swipeStartY;
    const axis = swipeAxis || (Math.abs(dx) > Math.abs(dy) ? 'x' : 'y');
    if (axis === 'x' && Math.abs(dx) >= swipeMin && queue.length > 1) {
      go(index + (dx < 0 ? 1 : -1));
      start();
    }
    resetSwipe();
  }

  mediaRoot.addEventListener('touchstart', function (event) {
    const touch = event.changedTouches[0];
    if (!touch) return;
    beginSwipe(touch.clientX, touch.clientY, event.target);
  }, { passive: true });

  mediaRoot.addEventListener('touchmove', function (event) {
    const touch = event.touches[0];
    if (!touch) return;
    trackSwipe(touch.clientX, touch.clientY);
  }, { passive: true });

  mediaRoot.addEventListener('touchend', function (event) {
    const touch = event.changedTouches[0];
    if (touch) finishSwipe(touch.clientX, touch.clientY);
    else resetSwipe();
  }, { passive: true });

  mediaRoot.addEventListener('touchcancel', resetSwipe);

  applySet();
  setInView(measureInView());

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function () {
      setInView(measureInView());
    }, { threshold: [0, 0.25, 0.5] });
    observer.observe(hero);
  }

  window.addEventListener('pageshow', function () {
    setInView(measureInView());
    syncMedia();
    start();
  });
})();
