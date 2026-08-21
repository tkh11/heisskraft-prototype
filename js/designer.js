(function () {
  const root = document.getElementById('specGallery');
  if (!root) return;

  const copies = Array.from(root.querySelectorAll('.spec-copy'));
  const slides = Array.from(root.querySelectorAll('.spec-slide'));
  const prevBtn = root.querySelector('[data-spec-prev]');
  const nextBtn = root.querySelector('[data-spec-next]');
  const media = root.querySelector('.spec-gallery-media');
  const total = Math.min(copies.length, slides.length);
  let index = 0;
  let touchX = null;

  function go(next) {
    if (!total) return;
    index = (next + total) % total;
    copies.forEach((el, i) => el.classList.toggle('is-active', i === index));
    slides.forEach((el, i) => el.classList.toggle('is-active', i === index));
  }

  if (prevBtn) prevBtn.addEventListener('click', () => go(index - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => go(index + 1));

  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(index - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(index + 1);
    }
  });

  if (media) {
    media.addEventListener('touchstart', (event) => {
      touchX = event.changedTouches[0].clientX;
    }, { passive: true });
    media.addEventListener('touchend', (event) => {
      if (touchX == null) return;
      const dx = event.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) < 40) return;
      go(index + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }
})();
