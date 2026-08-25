(function () {
  const printBtn = document.getElementById('legalPrint');
  if (printBtn) {
    printBtn.addEventListener('click', function () {
      window.print();
    });
  }

  const tabs = Array.from(document.querySelectorAll('.legal-toc a'));
  const sections = tabs
    .map(function (tab) {
      return document.querySelector(tab.getAttribute('href'));
    })
    .filter(Boolean);

  function setActiveTab(id) {
    tabs.forEach(function (tab) {
      tab.classList.toggle('is-active', tab.getAttribute('href') === '#' + id);
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      setActiveTab(tab.getAttribute('href').slice(1));
    });
  });

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(function (entries) {
      const visible = entries
        .filter(function (entry) { return entry.isIntersecting; })
        .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; })[0];
      if (visible && visible.target.id) setActiveTab(visible.target.id);
    }, { rootMargin: '-18% 0px -70% 0px', threshold: [0.1, 0.35, 0.6] });
    sections.forEach(function (section) { observer.observe(section); });
  }
})();
