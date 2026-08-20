(function () {
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp', 'txt', 'zip', 'rtf'];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const CART_KEY = 'heisskraft-request-cart';

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function loadCart() {
    try {
      const data = JSON.parse(sessionStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return [];
    }
  }

  function cartQty(items) {
    return items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  }

  function saveCart(items) {
    sessionStorage.setItem(CART_KEY, JSON.stringify(items));
    syncCartUI();
  }

  function syncBadges() {
    const count = cartQty(loadCart());
    document.querySelectorAll('.request-cart-count').forEach((badge) => {
      badge.hidden = count < 1;
      badge.textContent = count > 99 ? '99+' : String(count);
    });
    document.querySelectorAll('.request-cart-btn').forEach((btn) => {
      const label = count
        ? 'Открыть заявку, товаров: ' + count
        : 'Открыть заявку';
      btn.setAttribute('aria-label', label);
    });
  }

  function renderCartList() {
    const box = document.getElementById('requestCart');
    const list = document.getElementById('requestCartList');
    const sum = document.getElementById('requestCartSum');
    if (!box || !list) return;
    const items = loadCart();
    box.hidden = items.length === 0;
    if (sum) {
      const count = cartQty(items);
      sum.textContent = count ? count + ' шт.' : '';
    }
    list.innerHTML = items.map((item) => (
      '<li class="request-cart-item" data-cart-id="' + escapeHtml(item.id) + '">' +
        '<span class="request-cart-thumb">' +
          (item.image ? '<img src="' + escapeHtml(item.image) + '" alt="">' : '') +
        '</span>' +
        '<span class="request-cart-info">' +
          '<strong>' + escapeHtml(item.name) + '</strong>' +
          (item.sku ? '<span>Артикул: ' + escapeHtml(item.sku) + '</span>' : '') +
        '</span>' +
        '<span class="request-cart-qty">' +
          '<button type="button" class="request-cart-step" data-cart-step="-1" aria-label="Уменьшить количество">−</button>' +
          '<span>' + escapeHtml(item.qty) + '</span>' +
          '<button type="button" class="request-cart-step" data-cart-step="1" aria-label="Увеличить количество">+</button>' +
        '</span>' +
        '<button type="button" class="request-cart-remove" data-cart-remove aria-label="Удалить товар">Удалить</button>' +
      '</li>'
    )).join('');
  }

  function syncCartUI() {
    syncBadges();
    renderCartList();
  }

  function addToRequestCart(product) {
    if (!product || !product.id) return loadCart();
    const items = loadCart();
    const existing = items.find((item) => item.id === product.id);
    if (existing) {
      existing.qty = (Number(existing.qty) || 1) + 1;
    } else {
      items.push({
        id: product.id,
        name: product.name || product.id,
        sku: product.sku || '',
        series: product.series || '',
        image: product.image || '',
        qty: 1
      });
    }
    saveCart(items);
    return items;
  }

  function changeCartQty(id, delta) {
    const items = loadCart().map((item) => {
      if (item.id !== id) return item;
      return Object.assign({}, item, { qty: (Number(item.qty) || 1) + delta });
    }).filter((item) => item.qty > 0);
    saveCart(items);
  }

  function removeFromRequestCart(id) {
    saveCart(loadCart().filter((item) => item.id !== id));
  }

  function clearRequestCart() {
    saveCart([]);
  }

  function isInRequestCart(id) {
    return loadCart().some((item) => item.id === id);
  }

  const html = (
    '<div class="request-modal" id="requestModal" role="dialog" aria-modal="true" aria-labelledby="requestTitle" aria-hidden="true">' +
      '<div class="request-modal-box" role="document">' +
        '<div class="search-box-header">' +
          '<h2 id="requestTitle">Оставить заявку</h2>' +
          '<button type="button" class="search-close" id="requestClose" aria-label="Закрыть форму">' +
            '<svg viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
              '<path d="M4 4l10 10M14 4L4 14"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
        '<div class="request-modal-body">' +
          '<div class="request-success" id="requestSuccess" hidden>' +
            '<p>Спасибо! Ваша заявка отправлена</p>' +
            '<p class="request-success-note">Мы свяжемся с вами в ближайшее время.</p>' +
          '</div>' +
          '<form class="request-form" id="requestForm" novalidate>' +
            '<p class="request-lead">Оставьте заявку, и мы свяжемся с вами в ближайшее время</p>' +
            '<p class="request-form-error" id="requestFormError" role="alert" hidden></p>' +
            '<div class="request-field">' +
              '<label for="requestName">Как вас зовут?*</label>' +
              '<input type="text" id="requestName" name="name" autocomplete="name" maxlength="120" required />' +
              '<span class="request-error" id="requestNameError" role="alert"></span>' +
            '</div>' +
            '<div class="request-field">' +
              '<label for="requestPhone">Телефон*</label>' +
              '<input type="tel" id="requestPhone" name="phone" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" required />' +
              '<span class="request-error" id="requestPhoneError" role="alert"></span>' +
            '</div>' +
            '<div class="request-field">' +
              '<label for="requestEmail">Email*</label>' +
              '<input type="email" id="requestEmail" name="email" autocomplete="email" inputmode="email" required />' +
              '<span class="request-error" id="requestEmailError" role="alert"></span>' +
            '</div>' +
            '<div class="request-field">' +
              '<label for="requestCity">Из какого вы города?*</label>' +
              '<input type="text" id="requestCity" name="city" autocomplete="address-level2" maxlength="80" required />' +
              '<span class="request-error" id="requestCityError" role="alert"></span>' +
            '</div>' +
            '<div class="request-cart" id="requestCart" hidden>' +
              '<div class="request-cart-head">' +
                '<span>Товары в заявке</span>' +
                '<span class="request-cart-sum" id="requestCartSum"></span>' +
              '</div>' +
              '<ul class="request-cart-list" id="requestCartList"></ul>' +
            '</div>' +
            '<div class="request-field">' +
              '<label for="requestDetails">Детали обращения</label>' +
              '<textarea id="requestDetails" name="details" rows="4" maxlength="2000"></textarea>' +
            '</div>' +
            '<div class="request-field">' +
              '<span class="request-file-label" id="requestFileLabel">Прикрепить файл</span>' +
              '<p class="request-file-hint">Документ, изображение или техническое задание. До 10 МБ.</p>' +
              '<div class="request-file">' +
                '<input class="visually-hidden" type="file" id="requestFile" name="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt,.zip,.rtf,image/*,application/pdf" aria-labelledby="requestFileLabel" />' +
                '<label class="request-file-btn" for="requestFile">Выбрать файл</label>' +
                '<div class="request-file-picked" id="requestFilePicked" hidden>' +
                  '<span class="request-file-name" id="requestFileName"></span>' +
                  '<button type="button" class="request-file-remove" id="requestFileRemove">Удалить</button>' +
                '</div>' +
              '</div>' +
              '<span class="request-error" id="requestFileError" role="alert"></span>' +
            '</div>' +
            '<div class="request-field request-consent">' +
              '<label class="request-check">' +
                '<input type="checkbox" id="requestConsent" name="consent" required />' +
                '<span>Согласен на обработку персональных данных и принимаю <a href="#" data-action="privacy">политику конфиденциальности</a>*</span>' +
              '</label>' +
              '<span class="request-error" id="requestConsentError" role="alert"></span>' +
            '</div>' +
            '<button type="submit" class="btn-primary request-submit" id="requestSubmit">Отправить заявку</button>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</div>'
  );

  let modal;
  let form;
  let successEl;
  let formErrorEl;
  let lastFocus = null;
  let sending = false;
  let abortController = null;
  const fields = {};

  function ensureModal() {
    if (modal) return;
    document.body.insertAdjacentHTML('beforeend', html);
    modal = document.getElementById('requestModal');
    form = document.getElementById('requestForm');
    successEl = document.getElementById('requestSuccess');
    formErrorEl = document.getElementById('requestFormError');
    fields.name = document.getElementById('requestName');
    fields.phone = document.getElementById('requestPhone');
    fields.email = document.getElementById('requestEmail');
    fields.city = document.getElementById('requestCity');
    fields.details = document.getElementById('requestDetails');
    fields.file = document.getElementById('requestFile');
    fields.consent = document.getElementById('requestConsent');

    document.getElementById('requestClose').addEventListener('click', closeRequestForm);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeRequestForm();
    });
    form.addEventListener('submit', onSubmit);
    const cartList = document.getElementById('requestCartList');
    if (cartList) {
      cartList.addEventListener('click', (event) => {
        const row = event.target.closest('[data-cart-id]');
        if (!row) return;
        if (event.target.closest('[data-cart-remove]')) {
          removeFromRequestCart(row.getAttribute('data-cart-id'));
          return;
        }
        const step = event.target.closest('[data-cart-step]');
        if (step) changeCartQty(row.getAttribute('data-cart-id'), Number(step.getAttribute('data-cart-step')));
      });
    }
    fields.phone.addEventListener('focus', onPhoneFocus);
    fields.phone.addEventListener('input', onPhoneInput);
    fields.phone.addEventListener('keydown', onPhoneKeydown);
    fields.file.addEventListener('change', onFileChange);
    document.getElementById('requestFileRemove').addEventListener('click', clearFile);
    ['name', 'phone', 'email', 'city'].forEach((key) => {
      fields[key].addEventListener('input', () => clearFieldError(key));
      fields[key].addEventListener('blur', () => validateField(key));
    });
    fields.consent.addEventListener('change', () => clearFieldError('consent'));
  }

  function closeOverlays() {
    const searchClose = document.getElementById('searchClose');
    const searchModal = document.getElementById('searchModal');
    if (searchClose && searchModal && searchModal.classList.contains('is-open')) {
      searchClose.click();
    }
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn && menuBtn.classList.contains('is-open')) {
      menuBtn.click();
    }
  }

  function lockPage(on) {
    const pageRoot = document.getElementById('page');
    if (on) {
      if (pageRoot) {
        pageRoot.setAttribute('inert', '');
        pageRoot.setAttribute('aria-hidden', 'true');
      }
      document.body.style.overflow = 'hidden';
      return;
    }
    const productOpen = document.querySelector('.product-modal.is-open');
    const searchOpen = document.getElementById('searchModal') && document.getElementById('searchModal').classList.contains('is-open');
    const menuOpen = document.getElementById('mobileMenu') && document.getElementById('mobileMenu').classList.contains('is-open');
    if (pageRoot && !productOpen) {
      pageRoot.removeAttribute('inert');
      pageRoot.removeAttribute('aria-hidden');
    }
    if (!productOpen && !searchOpen && !menuOpen) {
      document.body.style.overflow = '';
    }
  }

  function digitsFromPhone(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    if (digits && !digits.startsWith('7')) digits = '7' + digits;
    return digits.slice(0, 11);
  }

  function formatPhone(digits) {
    const national = digits.slice(1);
    let result = '+7';
    if (digits.length === 0) return '';
    result += ' (';
    result += national.slice(0, 3);
    if (national.length >= 3) result += ') ';
    if (national.length > 3) result += national.slice(3, 6);
    if (national.length >= 6) result += '-';
    if (national.length > 6) result += national.slice(6, 8);
    if (national.length >= 8) result += '-';
    if (national.length > 8) result += national.slice(8, 10);
    return result;
  }

  function onPhoneFocus() {
    if (!fields.phone.value) fields.phone.value = '+7 (';
  }

  function onPhoneInput() {
    const digits = digitsFromPhone(fields.phone.value);
    fields.phone.value = formatPhone(digits);
    clearFieldError('phone');
  }

  function onPhoneKeydown(event) {
    if (event.key !== 'Backspace') return;
    const digits = digitsFromPhone(fields.phone.value);
    if (digits.length <= 1) {
      event.preventDefault();
      fields.phone.value = '+7 (';
    }
  }

  function fileExtension(name) {
    const parts = String(name || '').toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
  }

  function onFileChange() {
    clearFieldError('file');
    const file = fields.file.files && fields.file.files[0];
    const picked = document.getElementById('requestFilePicked');
    const nameEl = document.getElementById('requestFileName');
    if (!file) {
      picked.hidden = true;
      nameEl.textContent = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFieldError('file', 'Файл больше 10 МБ. Выберите файл меньшего размера.');
      clearFile();
      return;
    }
    const ext = fileExtension(file.name);
    if (ext && ACCEPTED_EXTENSIONS.indexOf(ext) === -1) {
      setFieldError('file', 'Можно прикрепить документ, изображение или архив: PDF, DOC, XLS, JPG, PNG, ZIP.');
      clearFile();
      return;
    }
    nameEl.textContent = file.name;
    picked.hidden = false;
  }

  function clearFile() {
    fields.file.value = '';
    document.getElementById('requestFilePicked').hidden = true;
    document.getElementById('requestFileName').textContent = '';
  }

  function setFieldError(key, message) {
    const input = key === 'consent' ? fields.consent : key === 'file' ? fields.file : fields[key];
    const error = document.getElementById('request' + key.charAt(0).toUpperCase() + key.slice(1) + 'Error');
    if (error) error.textContent = message || '';
    const wrap = error && error.closest('.request-field');
    if (wrap) wrap.classList.toggle('has-error', Boolean(message));
    if (input) {
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (message) input.setAttribute('aria-describedby', error.id);
      else input.removeAttribute('aria-describedby');
    }
  }

  function clearFieldError(key) {
    setFieldError(key, '');
  }

  function validateField(key) {
    const value = key === 'consent'
      ? fields.consent.checked
      : String(fields[key].value || '').trim();

    if (key === 'name') {
      if (!value) return setFieldError('name', 'Укажите, как к вам обращаться'), false;
      return clearFieldError('name'), true;
    }
    if (key === 'phone') {
      const digits = digitsFromPhone(fields.phone.value);
      if (digits.length < 11) return setFieldError('phone', 'Введите номер полностью: +7 (___) ___-__-__'), false;
      return clearFieldError('phone'), true;
    }
    if (key === 'email') {
      if (!value) return setFieldError('email', 'Укажите email'), false;
      if (!EMAIL_RE.test(value)) return setFieldError('email', 'Введите корректный email, например name@company.ru'), false;
      return clearFieldError('email'), true;
    }
    if (key === 'city') {
      if (!value) return setFieldError('city', 'Укажите город'), false;
      return clearFieldError('city'), true;
    }
    if (key === 'consent') {
      if (!fields.consent.checked) return setFieldError('consent', 'Нужно согласие на обработку персональных данных'), false;
      return clearFieldError('consent'), true;
    }
    return true;
  }

  function validateForm() {
    const order = ['name', 'phone', 'email', 'city', 'consent'];
    let firstInvalid = null;
    order.forEach((key) => {
      if (!validateField(key) && !firstInvalid) firstInvalid = key;
    });
    if (firstInvalid) {
      const el = firstInvalid === 'consent' ? fields.consent : fields[firstInvalid];
      el.focus();
      return false;
    }
    return true;
  }

  function setSending(on) {
    sending = on;
    const button = document.getElementById('requestSubmit');
    button.disabled = on;
    button.classList.toggle('is-loading', on);
    button.textContent = on ? 'Отправка…' : 'Отправить заявку';
    Array.prototype.forEach.call(form.elements, (el) => {
      if (el === button) return;
      if (el.id === 'requestFileRemove') return;
      el.disabled = on;
    });
    document.getElementById('requestFileRemove').disabled = on;
  }

  function showFormError(message) {
    formErrorEl.hidden = !message;
    formErrorEl.textContent = message || '';
  }

  function showSuccess() {
    form.hidden = true;
    successEl.hidden = false;
    document.getElementById('requestClose').focus();
  }

  function resetView() {
    if (abortController) abortController.abort();
    abortController = null;
    form.reset();
    clearFile();
    ['name', 'phone', 'email', 'city', 'consent', 'file'].forEach(clearFieldError);
    showFormError('');
    form.hidden = false;
    successEl.hidden = true;
    setSending(false);
    fields.phone.value = '';
  }

  async function submitPayload(formData) {
    if (typeof window.submitSiteRequest === 'function') {
      return window.submitSiteRequest(formData);
    }
    const endpoint = window.REQUEST_FORM_ENDPOINT;
    if (endpoint) {
      abortController = new AbortController();
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      });
      if (!response.ok) {
        let message = 'Не удалось отправить заявку. Попробуйте ещё раз.';
        try {
          const data = await response.json();
          if (data && (data.message || data.error)) message = data.message || data.error;
        } catch (err) {}
        throw new Error(message);
      }
      return;
    }
    await new Promise((resolve, reject) => {
      abortController = new AbortController();
      const timer = setTimeout(resolve, 700);
      abortController.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (sending) return;
    showFormError('');
    if (!validateForm()) return;

    const formData = new FormData();
    formData.append('name', fields.name.value.trim());
    formData.append('phone', fields.phone.value.trim());
    formData.append('email', fields.email.value.trim());
    formData.append('city', fields.city.value.trim());
    formData.append('details', fields.details.value.trim());
    formData.append('consent', 'true');
    formData.append('page', window.location.href);
    const cartItems = loadCart();
    if (cartItems.length) {
      formData.append('products', JSON.stringify(cartItems));
      cartItems.forEach((item, index) => {
        formData.append('products[' + index + '][id]', item.id);
        formData.append('products[' + index + '][name]', item.name);
        formData.append('products[' + index + '][sku]', item.sku || '');
        formData.append('products[' + index + '][qty]', String(item.qty || 1));
      });
    }
    if (fields.file.files && fields.file.files[0]) {
      formData.append('file', fields.file.files[0]);
    }

    setSending(true);
    try {
      await submitPayload(formData);
      setSending(false);
      clearRequestCart();
      showSuccess();
    } catch (err) {
      setSending(false);
      if (err && err.name === 'AbortError') return;
      showFormError((err && err.message) || 'Не удалось отправить заявку. Попробуйте ещё раз.');
      formErrorEl.scrollIntoView({ block: 'nearest' });
    }
  }

  function focusables() {
    return Array.prototype.filter.call(
      modal.querySelectorAll('button, [href], input, textarea, select'),
      (el) => !el.disabled && el.offsetParent !== null && !el.hidden
    );
  }

  function openRequestForm(options) {
    options = options || {};
    ensureModal();
    closeOverlays();
    if (!modal.classList.contains('is-open')) lastFocus = document.activeElement;
    if (!successEl.hidden) resetView();
    if (options.product && !isInRequestCart(options.product.id)) addToRequestCart(options.product);
    if (options.details && fields.details) {
      const current = fields.details.value.trim();
      fields.details.value = current
        ? (current.indexOf(options.details) === -1 ? current + '\n\n' + options.details : current)
        : options.details;
    }
    renderCartList();
    lockPage(true);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => {
      if (form.hidden) document.getElementById('requestClose').focus();
      else fields.name.focus();
    }, 40);
  }

  function closeRequestForm() {
    if (!modal || !modal.classList.contains('is-open')) return;
    const hadSuccess = !successEl.hidden;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (sending) {
      if (abortController) abortController.abort();
      setSending(false);
    }
    if (hadSuccess) resetView();
    lockPage(false);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  document.addEventListener('keydown', (event) => {
    if (!modal || !modal.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeRequestForm();
      return;
    }
    if (event.key !== 'Tab') return;
    const list = focusables();
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, true);

  window.openRequestForm = openRequestForm;
  window.closeRequestForm = closeRequestForm;
  window.addToRequestCart = addToRequestCart;
  window.removeFromRequestCart = removeFromRequestCart;
  window.isInRequestCart = isInRequestCart;
  syncCartUI();
  document.addEventListener('layout:ready', syncBadges);
})();
