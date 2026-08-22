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
    desktop: ['lakhta', 'market', 'production'],
    mobile: ['lakhta', 'production', 'warranty']
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
    if (video.classList.contains('hero-media-desktop')) return !mobileMq.matches;
    if (video.classList.contains('hero-media-mobile')) return mobileMq.matches;
    return true;
  }

  function measureInView() {
    const rect = hero.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    return visible > 0 && visible >= Math.min(rect.height, vh) * 0.25;
  }

  function syncMedia() {
    const activeId = queue[index];
    videos.forEach((video) => {
      const slide = video.closest('.hero-slide');
      const on = slide && slide.dataset.slide === activeId && videoAllowed(video);
      if (on && inView) {
        video.muted = true;
        video.loop = true;
        const play = video.play();
        if (play) play.catch(() => {});
      } else {
        video.pause();
        if (!on) {
          try { video.currentTime = 0; } catch (err) {}
        }
      }
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

  setInView(measureInView());
  applySet();

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
