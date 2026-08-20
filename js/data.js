(function (global) {
  function siteRoot() {
    const script = document.querySelector('script[src*="data.js"]') || document.querySelector('script[src*="layout.js"]');
    if (script && script.src) return new URL('../', script.src);
    return new URL('.', window.location.href);
  }

  const inflight = Object.create(null);
  let fusePromise = null;
  let layoutReadyResolve;
  const layoutReady = new Promise((resolve) => {
    layoutReadyResolve = resolve;
  });

  function request(path, asJson) {
    const url = new URL(path, siteRoot()).href;
    if (!inflight[url]) {
      inflight[url] = fetch(url).then((response) => {
        if (!response.ok) throw new Error('Не удалось загрузить ' + path);
        return asJson ? response.json() : response.text();
      });
    }
    return inflight[url];
  }

  function loadFuse() {
    if (typeof global.Fuse === 'function') return Promise.resolve(global.Fuse);
    if (!fusePromise) {
      fusePromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js';
        script.async = true;
        script.onload = function () {
          resolve(typeof global.Fuse === 'function' ? global.Fuse : null);
        };
        script.onerror = function () {
          fusePromise = null;
          reject(new Error('Не удалось загрузить Fuse.js'));
        };
        document.head.appendChild(script);
      });
    }
    return fusePromise;
  }

  global.Heisskraft = {
    siteRoot: siteRoot,
    layoutReady: layoutReady,
    markLayoutReady: function () {
      layoutReadyResolve();
      document.dispatchEvent(new CustomEvent('layout:ready'));
    },
    loadJSON: function (path) {
      return request(path, true);
    },
    loadText: function (path) {
      return request(path, false);
    },
    products: function () {
      return request('data/products.json', true);
    },
    catalog: function () {
      return request('data/catalog.json', true);
    },
    loadFuse: loadFuse
  };

  global.Heisskraft.products();
  if (document.getElementById('catalogContent') || document.getElementById('pumpSelectForm')) {
    global.Heisskraft.catalog();
  }

  document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"][media="print"]').forEach((link) => {
    const apply = function () { link.media = 'all'; };
    if (link.sheet) apply();
    else link.addEventListener('load', apply);
  });
})(window);
