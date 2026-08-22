(function () {
  const banner = document.querySelector('.contractor-hero video');
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
    if (play) play.catch(function () {});
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) playBanner();
        else banner.pause();
      });
    }, { threshold: 0.2 });
    observer.observe(banner);
  } else {
    playBanner();
  }
})();
