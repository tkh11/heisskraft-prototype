(function () {
  const PDFJS_SRC = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
  const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const FLIP_MS = 780;

  const gridEl = document.getElementById('docsGrid');
  const libraryEl = document.getElementById('docsLibrary');
  const readerEl = document.getElementById('docsReader');
  const pageEl = document.getElementById('docs');
  const downloadEl = document.getElementById('docsDownload');
  const backEl = document.getElementById('docsBack');
  const readerTitleEl = document.getElementById('docsReaderTitle');
  const bookEl = document.getElementById('docsBook');
  const sheetEl = document.getElementById('docsSheet');
  const loadingEl = document.getElementById('docsLoading');
  const loadingText = document.getElementById('docsLoadingText');
  const counterEl = document.getElementById('docsCounter');
  const prevBtn = document.getElementById('docsPrev');
  const nextBtn = document.getElementById('docsNext');
  const leftPage = bookEl && bookEl.querySelector('.docs-page[data-side="left"]');
  const rightPage = bookEl && bookEl.querySelector('.docs-page[data-side="right"]');

  if (!gridEl || !bookEl) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const singleMq = window.matchMedia('(max-width: 760px)');

  let catalogs = [];
  let active = null;
  let pdfDoc = null;
  let loadTask = null;
  let pageCount = 0;
  let pageAspect = 210 / 297;
  let current = 0;
  let busy = false;
  let bitmapCache = new Map();
  let bitmapInflight = new Map();
  let loadGen = 0;
  let pdfjsReady = null;

  function siteFile(path) {
    if (window.Heisskraft && typeof window.Heisskraft.siteRoot === 'function') {
      return new URL(path, window.Heisskraft.siteRoot()).href;
    }
    return path;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function loadScript(src) {
    if (!pdfjsReady) {
      pdfjsReady = new Promise((resolve, reject) => {
        if (window.pdfjsLib) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
          pdfjsReady = null;
          reject(new Error('Не удалось загрузить библиотеку просмотра PDF'));
        };
        document.head.appendChild(script);
      }).then(() => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      });
    }
    return pdfjsReady;
  }

  function isSingle() {
    return singleMq.matches;
  }

  function isReading() {
    return !readerEl.hidden;
  }

  function setLoading(on, text) {
    loadingEl.hidden = !on;
    bookEl.classList.toggle('is-loading', on);
    if (text) loadingText.textContent = text;
  }

  function paintBlank(pageEl) {
    const canvas = pageEl.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1;
    canvas.height = 1;
    ctx.clearRect(0, 0, 1, 1);
    pageEl.classList.add('is-blank');
  }

  function getBitmap(pageNum) {
    if (!pageNum || pageNum < 1 || pageNum > pageCount) return Promise.resolve(null);
    if (bitmapCache.has(pageNum)) return Promise.resolve(bitmapCache.get(pageNum));
    if (bitmapInflight.has(pageNum)) return bitmapInflight.get(pageNum);

    const job = (async () => {
      if (!pdfDoc) return null;
      if (bitmapCache.has(pageNum)) return bitmapCache.get(pageNum);
      const page = await pdfDoc.getPage(pageNum);
      const base = page.getViewport({ scale: 1 });
      const target = Math.min(1400, Math.max(720, Math.round((bookEl.clientWidth / (isSingle() ? 1 : 2)) * (window.devicePixelRatio || 1) * 1.25)));
      const scale = target / base.width;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const bitmap = typeof createImageBitmap === 'function'
        ? await createImageBitmap(canvas)
        : canvas;
      bitmapCache.set(pageNum, bitmap);
      return bitmap;
    })().finally(() => {
      bitmapInflight.delete(pageNum);
    });

    bitmapInflight.set(pageNum, job);
    return job;
  }

  function ensurePages(nums) {
    return Promise.all((nums || []).map((n) => getBitmap(n)));
  }

  function drawBitmap(target, bitmap) {
    if (!bitmap) {
      paintBlank(target);
      return;
    }
    target.classList.remove('is-blank');
    const canvas = target.querySelector('canvas');
    let rect = target.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) {
      const pages = isSingle() ? 1 : 2;
      rect = {
        width: bookEl.clientWidth / pages,
        height: bookEl.clientHeight
      };
    }
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
  }

  function loadCoverImage(item) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = siteFile(item.cover);
    });
  }

  function paintPage(target, pageNum) {
    if (!pageNum || pageNum < 1 || pageNum > pageCount) {
      paintBlank(target);
      return Promise.resolve();
    }
    return getBitmap(pageNum).then((bitmap) => drawBitmap(target, bitmap));
  }

  function layoutBook() {
    const frame = bookEl.parentElement;
    const frameW = frame.clientWidth;
    const frameH = frame.clientHeight;
    if (!frameW || !frameH) return;
    const spread = !isSingle();
    const pages = spread ? 2 : 1;
    let width = frameW;
    let height = width / pages / pageAspect;
    if (height > frameH) {
      height = frameH;
      width = height * pageAspect * pages;
    }
    bookEl.style.width = Math.floor(width) + 'px';
    bookEl.style.height = Math.floor(height) + 'px';
    bookEl.classList.toggle('is-single', !spread);
  }

  function pageLabel() {
    if (!pageCount) return '';
    if (isSingle()) return current + ' / ' + pageCount;
    if (current === 0) return 'Обложка · 1 / ' + pageCount;
    const left = current;
    const right = current + 1 <= pageCount ? current + 1 : null;
    if (right) return left + '–' + right + ' / ' + pageCount;
    return left + ' / ' + pageCount;
  }

  function updateChrome() {
    const atStart = isSingle() ? current <= 1 : current === 0;
    const lastLeft = pageCount % 2 === 0 ? pageCount : pageCount - 1;
    const ended = isSingle() ? current >= pageCount : current >= lastLeft;
    prevBtn.disabled = atStart || busy;
    nextBtn.disabled = ended || busy;
    counterEl.textContent = pageLabel();
    bookEl.classList.toggle('is-closed', !isSingle() && current === 0);
  }

  function visiblePages() {
    if (isSingle()) return [current];
    if (current === 0) return [1];
    return [current, current + 1];
  }

  function preloadAround() {
    const nums = new Set();
    visiblePages().forEach((n) => {
      nums.add(n - 1);
      nums.add(n);
      nums.add(n + 1);
      nums.add(n + 2);
      nums.add(n + 3);
    });
    ensurePages(Array.from(nums));
  }

  function renderSpread() {
    layoutBook();
    if (isSingle()) {
      paintBlank(leftPage);
      return paintPage(rightPage, current).then(updateChrome);
    }
    if (current === 0) {
      paintBlank(leftPage);
      return paintPage(rightPage, 1).then(updateChrome);
    }
    return Promise.all([
      paintPage(leftPage, current),
      paintPage(rightPage, current + 1)
    ]).then(updateChrome);
  }

  function waitFlip() {
    if (reduceMotion.matches) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        sheetEl.removeEventListener('transitionend', onEnd);
        resolve();
      };
      const onEnd = (e) => {
        if (e.propertyName === 'transform') done();
      };
      sheetEl.addEventListener('transitionend', onEnd);
      window.setTimeout(done, FLIP_MS + 80);
    });
  }

  async function animateFlip(dir) {
    const front = sheetEl.querySelector('.is-front');
    const back = sheetEl.querySelector('.is-back');

    if (isSingle()) {
      const from = current;
      const to = dir === 'next' ? current + 1 : current - 1;
      await ensurePages([from, to, to + 1, to - 1]);
      sheetEl.className = 'docs-sheet is-single is-' + dir;
      sheetEl.style.transform = dir === 'next' ? 'rotateY(0deg)' : 'rotateY(-180deg)';
      await Promise.all([paintPage(front, from), paintPage(back, to)]);
      sheetEl.classList.add('is-animating');
      await new Promise((r) => requestAnimationFrame(r));
      await paintPage(rightPage, to);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      sheetEl.style.transform = dir === 'next' ? 'rotateY(-180deg)' : 'rotateY(0deg)';
      await waitFlip();
      current = to;
      sheetEl.className = 'docs-sheet';
      sheetEl.style.transform = '';
      updateChrome();
      preloadAround();
      return;
    }

    if (dir === 'next') {
      const oldRight = current === 0 ? 1 : current + 1;
      const newLeft = current === 0 ? 2 : current + 2;
      const newRight = newLeft + 1;
      await Promise.all([
        paintPage(front, oldRight),
        paintPage(back, newLeft),
        paintPage(rightPage, newRight)
      ]);
      sheetEl.className = 'docs-sheet is-animating is-next';
      sheetEl.style.transform = 'rotateY(0deg)';
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      sheetEl.style.transform = 'rotateY(-180deg)';
      await waitFlip();
      current = current === 0 ? 2 : current + 2;
    } else {
      const newCurrent = current === 2 ? 0 : current - 2;
      const oldLeft = current;
      const prevRight = newCurrent === 0 ? 1 : newCurrent + 1;
      await Promise.all([
        paintPage(front, oldLeft),
        paintPage(back, prevRight),
        paintPage(leftPage, newCurrent === 0 ? 0 : newCurrent)
      ]);
      if (newCurrent === 0) paintBlank(leftPage);
      sheetEl.className = 'docs-sheet is-animating is-prev';
      sheetEl.style.transform = 'rotateY(0deg)';
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      sheetEl.style.transform = 'rotateY(180deg)';
      await waitFlip();
      current = newCurrent;
    }

    sheetEl.className = 'docs-sheet';
    sheetEl.style.transform = '';
    await renderSpread();
  }

  async function flip(dir) {
    if (!isReading() || busy || !pdfDoc) return;
    if (dir === 'next') {
      if (isSingle() && current >= pageCount) return;
      if (!isSingle()) {
        const lastLeft = pageCount % 2 === 0 ? pageCount : pageCount - 1;
        if (current >= lastLeft || (current === 0 && pageCount <= 1)) return;
      }
    } else if (isSingle() ? current <= 1 : current === 0) {
      return;
    }

    busy = true;
    updateChrome();
    bookEl.classList.add('is-flipping');
    try {
      if (reduceMotion.matches) {
        if (isSingle()) current += dir === 'next' ? 1 : -1;
        else current = dir === 'next' ? (current === 0 ? 2 : current + 2) : (current === 2 ? 0 : current - 2);
        await renderSpread();
      } else {
        await animateFlip(dir);
      }
      preloadAround();
    } finally {
      busy = false;
      bookEl.classList.remove('is-flipping');
      updateChrome();
    }
  }

  function clearCache() {
    bitmapCache.forEach((bmp) => {
      if (bmp && typeof bmp.close === 'function') bmp.close();
    });
    bitmapCache = new Map();
    bitmapInflight = new Map();
  }

  function destroyPdf() {
    loadGen += 1;
    clearCache();
    if (loadTask) {
      try { loadTask.destroy(); } catch (err) { /* ignore */ }
      loadTask = null;
    }
    if (pdfDoc) {
      try { pdfDoc.destroy(); } catch (err) { /* ignore */ }
      pdfDoc = null;
    }
    pageCount = 0;
    current = 0;
    active = null;
    busy = false;
  }

  function showLibrary() {
    destroyPdf();
    readerEl.hidden = true;
    libraryEl.hidden = false;
    pageEl.classList.remove('is-reading');
    counterEl.textContent = '';
    setLoading(false);
  }

  function showReader(item) {
    libraryEl.hidden = true;
    readerEl.hidden = false;
    pageEl.classList.add('is-reading');
    readerTitleEl.textContent = item.title;
    downloadEl.href = siteFile(item.file);
    downloadEl.setAttribute('download', item.title + '.pdf');
  }

  async function openCatalog(item) {
    active = item;
    showReader(item);
    busy = true;
    current = isSingle() ? 1 : 0;
    pageCount = 0;
    const gen = ++loadGen;
    clearCache();
    if (loadTask) {
      try { loadTask.destroy(); } catch (err) { /* ignore */ }
      loadTask = null;
    }
    if (pdfDoc) {
      try { pdfDoc.destroy(); } catch (err) { /* ignore */ }
      pdfDoc = null;
    }

    setLoading(true, 'Загрузка «' + item.title + '»…');
    counterEl.textContent = '';
    paintBlank(leftPage);
    paintBlank(rightPage);

    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const coverImg = await loadCoverImage(item);
    if (gen !== loadGen) return;
    if (coverImg) {
      pageAspect = coverImg.naturalWidth / coverImg.naturalHeight;
      layoutBook();
      paintBlank(leftPage);
      drawBitmap(rightPage, coverImg);
      setLoading(false);
      counterEl.textContent = 'Открываем каталог…';
      busy = false;
      updateChrome();
    }

    try {
      await loadScript(PDFJS_SRC);
      if (gen !== loadGen) return;
      loadTask = window.pdfjsLib.getDocument({
        url: siteFile(item.file),
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true
      });
      loadTask.onProgress = function (evt) {
        if (gen !== loadGen) return;
        if (evt.total) {
          const pct = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
          counterEl.textContent = 'Открываем каталог… ' + pct + '%';
        }
      };
      pdfDoc = await loadTask.promise;
      if (gen !== loadGen) {
        try { pdfDoc.destroy(); } catch (err) { /* ignore */ }
        return;
      }
      pageCount = pdfDoc.numPages;
      const first = await pdfDoc.getPage(1);
      const viewport = first.getViewport({ scale: 1 });
      pageAspect = viewport.width / viewport.height;
      layoutBook();
      current = isSingle() ? 1 : 0;
      await renderSpread();
      if (gen !== loadGen) return;
      setLoading(false);
      if (isSingle()) await ensurePages([current + 1, current + 2, current + 3]);
      else await ensurePages([2, 3, 4, 5]);
      if (gen !== loadGen) return;
      preloadAround();
    } catch (err) {
      if (gen !== loadGen) return;
      console.warn(err);
      setLoading(true, 'Не удалось открыть PDF. Скачайте файл и откройте его локально.');
    } finally {
      if (gen === loadGen) {
        busy = false;
        updateChrome();
      }
    }
  }

  function catalogFromHash() {
    const id = (window.location.hash || '').replace(/^#/, '');
    if (!id) return null;
    return catalogs.find((item) => item.id === id) || null;
  }

  function renderGrid() {
    gridEl.innerHTML = catalogs.map((item) => (
      '<a class="docs-tile" href="#' + encodeURIComponent(item.id) + '">' +
        '<span class="docs-tile-cover">' +
          '<img src="' + escapeHtml(siteFile(item.cover)) + '" alt="" width="420" height="594" loading="lazy" decoding="async" />' +
        '</span>' +
        '<span class="docs-tile-copy">' +
          '<span class="docs-tile-title">' + escapeHtml(item.title) + '</span>' +
          '<span class="docs-tile-hint">' + escapeHtml(item.hint) + '</span>' +
        '</span>' +
      '</a>'
    )).join('');
  }

  function syncFromLocation() {
    const item = catalogFromHash();
    if (!item) {
      showLibrary();
      return;
    }
    if (active && active.id === item.id && isReading()) return;
    openCatalog(item);
  }

  function goToLibrary(e) {
    if (e) e.preventDefault();
    const url = new URL(window.location.href);
    url.hash = '';
    history.pushState(null, '', url.pathname + url.search);
    showLibrary();
  }

  prevBtn.addEventListener('click', () => flip('prev'));
  nextBtn.addEventListener('click', () => flip('next'));
  backEl.addEventListener('click', goToLibrary);

  let pointerStart = null;
  bookEl.addEventListener('pointerdown', (e) => {
    if (!isReading() || busy || e.button) return;
    pointerStart = { x: e.clientX, y: e.clientY };
  });
  bookEl.addEventListener('pointerup', (e) => {
    if (!pointerStart || busy) {
      pointerStart = null;
      return;
    }
    const dx = e.clientX - pointerStart.x;
    const dy = e.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      flip(dx < 0 ? 'next' : 'prev');
      return;
    }
    const rect = bookEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (x > 0.62) flip('next');
    else if (x < 0.38) flip('prev');
  });

  document.addEventListener('keydown', (e) => {
    if (!isReading()) return;
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === 'Escape') {
      goToLibrary(e);
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      flip('next');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      flip('prev');
    }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    if (!isReading()) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (!pdfDoc || busy) {
        layoutBook();
        return;
      }
      const wasSingle = bookEl.classList.contains('is-single');
      const nowSingle = isSingle();
      if (wasSingle !== nowSingle) {
        current = nowSingle ? Math.max(1, current || 1) : (current <= 1 ? 0 : (current % 2 === 0 ? current : current - 1));
      }
      renderSpread();
    }, 120);
  });

  window.addEventListener('hashchange', syncFromLocation);
  window.addEventListener('popstate', syncFromLocation);

  const loadList = (window.Heisskraft && typeof window.Heisskraft.loadJSON === 'function')
    ? window.Heisskraft.loadJSON('data/docs.json')
    : fetch(siteFile('data/docs.json')).then((res) => {
      if (!res.ok) throw new Error('Не удалось загрузить список каталогов');
      return res.json();
    });

  loadList.then((items) => {
    catalogs = Array.isArray(items) ? items : [];
    if (!catalogs.length) {
      gridEl.innerHTML = '<p class="catalog-lead">Каталоги скоро появятся.</p>';
      return;
    }
    renderGrid();
    syncFromLocation();
  }).catch((err) => {
    console.warn(err);
    gridEl.innerHTML = '<p class="catalog-lead">Не удалось загрузить список каталогов.</p>';
  });
})();
