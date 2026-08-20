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
    videos.forEach((video) => {
      const active = video.closest('.hero-slide').classList.contains('is-active') && videoAllowed(video);
      if (active && inView) {
        video.muted = true;
        video.loop = true;
        const play = video.play();
        if (play) play.catch(() => {});
      } else {
        video.pause();
        if (!active) video.currentTime = 0;
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
