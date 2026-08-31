(function initHeroSlider() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const allSlides = Array.from(hero.querySelectorAll('.hero-slide'));
  const allTitles = Array.from(hero.querySelectorAll('.hero-titles .hero-title'));
  const allCtas = Array.from(hero.querySelectorAll('.hero-cta .btn-primary'));
  const dotsRoot = hero.querySelector('.hero-dots');
  const videos = Array.from(hero.querySelectorAll('video'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileMq = window.matchMedia('(max-width: 640px)');
  const queues = {
    desktop: ['market', 'lakhta', 'production'],
    mobile: ['market', 'lakhta', 'production', 'warranty']
  };
  const FADE_MS = 700;
  let queue = [];
  let index = 0;
  let timer = null;
  let inView = false;
  let playGen = 0;
  let playingVideo = null;
  let unloadTimer = null;
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

  function attachVideo(video) {
    let changed = false;
    video.querySelectorAll('source[data-src]').forEach((source) => {
      const url = source.getAttribute('data-src');
      if (source.getAttribute('src') !== url) {
        source.setAttribute('src', url);
        changed = true;
      }
    });
    video.preload = 'auto';
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

  function pauseVideo(video) {
    video.pause();
  }

  function resetAndDetach(video) {
    pauseVideo(video);
    try { video.currentTime = 0; } catch (err) {}
    detachVideo(video);
  }

  function stopOthers(keep) {
    videos.forEach((video) => {
      if (video === keep) return;
      pauseVideo(video);
    });
    clearTimeout(unloadTimer);
    unloadTimer = setTimeout(function () {
      videos.forEach((video) => {
        if (video === playingVideo) return;
        resetAndDetach(video);
      });
    }, FADE_MS);
  }

  function playSlideVideo(video, restart) {
    const gen = ++playGen;
    playingVideo = video;
    stopOthers(video);
    attachVideo(video);
    video.muted = true;
    video.loop = true;

    function start() {
      if (gen !== playGen || playingVideo !== video) return;
      if (restart) {
        try { video.currentTime = 0; } catch (err) {}
      }
      const play = video.play();
      if (play) play.catch(function () {});
    }

    if (video.readyState >= 2) start();
    else video.addEventListener('canplay', start, { once: true });
  }

  function activeVideo() {
    const activeId = queue[index];
    return videos.find(function (video) {
      const slide = video.closest('.hero-slide');
      return videoAllowed(video) && slide && slide.dataset.slide === activeId;
    }) || null;
  }

  function syncMedia(restart) {
    if (!inView) {
      playGen += 1;
      playingVideo = null;
      videos.forEach(resetAndDetach);
      return;
    }

    const target = activeVideo();
    if (!target) {
      playGen += 1;
      playingVideo = null;
      stopOthers(null);
      return;
    }

    const shouldRestart = restart || playingVideo !== target;
    playSlideVideo(target, shouldRestart);
  }

  function go(next, restartVideo) {
    if (!queue.length) return;
    const prev = index;
    index = (next + queue.length) % queue.length;
    const activeId = queue[index];
    const changed = prev !== index;
    allSlides.forEach((slide) => {
      slide.classList.toggle('is-active', slide.dataset.slide === activeId);
    });
    allTitles.forEach((title) => {
      title.classList.toggle('is-active', title.dataset.slide === activeId);
    });
    allCtas.forEach((cta) => {
      cta.classList.toggle('is-active', cta.dataset.slide === activeId);
    });
    Array.from(dotsRoot.querySelectorAll('button')).forEach((dot, i) => {
      const on = i === index;
      dot.classList.toggle('is-active', on);
      if (on) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    syncMedia(restartVideo !== false && (changed || restartVideo === true));
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
        go(i, true);
        start();
      });
    });
    index = 0;
    playingVideo = null;
    go(0, true);
    start();
  }

  function setInView(next) {
    const was = inView;
    inView = next;
    if (inView) {
      syncMedia(!was);
      if (!was) start();
    } else {
      stop();
      syncMedia(false);
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
      go(index + (dx < 0 ? 1 : -1), true);
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

  function measureInView() {
    const rect = hero.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    return visible > 0 && visible >= Math.min(rect.height, vh) * 0.25;
  }

  setInView(measureInView());

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function () {
      setInView(measureInView());
    }, { threshold: [0, 0.25, 0.5] });
    observer.observe(hero);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stop();
      if (playingVideo) playingVideo.pause();
    } else {
      setInView(measureInView());
    }
  });

  window.addEventListener('pageshow', function () {
    setInView(measureInView());
  });
})();
