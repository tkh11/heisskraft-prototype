(function () {
  const COPY_ALL = [
    'ООО «Хайсскрафт Импекс»',
    'Полное наименование: Общество с ограниченной ответственностью «Хайсскрафт Импекс»',
    'Юридический адрес: 141214, Московская область, г. Пушкино, пос. Зверосовхоза, ул. Соболиная, д. 11, стр. 1, офис 1-19',
    'Фактический адрес: 141214, Московская область, г. Пушкино, пос. Зверосовхоза, ул. Соболиная, д. 11, стр. 1, офис 1-19',
    'Телефон: +7 (495) 258-45-42',
    'ОГРН: 1037728027369',
    'ИНН: 7728291164',
    'КПП: 503801001',
    'р/с: 40702810903960001239',
    'к/с: 30101810145250000411',
    'Банк: Филиал «Центральный» Банка ВТБ (ПАО)',
    'БИК: 044525411',
    'ОКПО: 14665714',
    'ОКОГУ: 4210014',
    'ОКАТО: 46458000126',
    'ОКТМО: 46758000',
    'ОКФС: 16',
    'ОКОПФ: 12300',
    'ОКВЭД: 22.23 (основной); 22.21; 46.74',
    'Генеральный директор: Сафонов Александр Валентинович',
    'Главный бухгалтер: Ковалева Ирина Сергеевна'
  ].join('\n');

  function toast(message) {
    if (window.showToast) window.showToast(message);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(area);
      }
    });
  }

  function markCopied(el) {
    el.classList.add('is-copied');
    window.setTimeout(function () {
      el.classList.remove('is-copied');
    }, 900);
  }

  function onCopyClick(el) {
    const value = el.getAttribute('data-copy');
    if (!value) return;
    const label = el.getAttribute('data-label') || 'Реквизит';
    copyText(value)
      .then(function () {
        markCopied(el);
        toast('Скопировано: ' + label);
      })
      .catch(function () {
        toast('Не удалось скопировать');
      });
  }

  document.addEventListener('click', function (e) {
    const copyEl = e.target.closest('[data-copy]');
    if (copyEl && copyEl.closest('.page-requisites')) {
      e.preventDefault();
      onCopyClick(copyEl);
    }
  });

  const copyAll = document.getElementById('reqCopyAll');
  if (copyAll) {
    copyAll.addEventListener('click', function () {
      copyText(COPY_ALL)
        .then(function () {
          toast('Все реквизиты скопированы');
        })
        .catch(function () {
          toast('Не удалось скопировать');
        });
    });
  }

  const tabs = Array.from(document.querySelectorAll('.req-tabs a'));
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
    }, { rootMargin: '-20% 0px -60% 0px', threshold: [0.15, 0.4, 0.7] });
    sections.forEach(function (section) { observer.observe(section); });
  }
})();
