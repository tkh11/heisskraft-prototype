(function () {
  const nav = document.querySelector('.designer-toc');
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
  const sections = links
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  function setActive(id) {
    links.forEach((link) => {
      link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
    });
  }

  function currentId() {
    const offset = nav.getBoundingClientRect().bottom + 24;
    let active = sections[0];
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= offset) active = section;
    });
    return active ? active.id : '';
  }

  function sync() {
    const id = currentId();
    if (id) setActive(id);
  }

  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();
})();
