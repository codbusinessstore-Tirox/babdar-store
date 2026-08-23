(function () {
  'use strict';

  /* ==========================================================================
     Shared order state — both form instances read/write this single object
     so a submission from either one immediately disables both. No
     localStorage: both instances live on the same page load. (CLAUDE.md §7)
     ========================================================================== */

  var orderState = {
    submitted: false,
    listeners: [],
    onSubmitted: function (fn) { this.listeners.push(fn); },
    markSubmitted: function () {
      if (this.submitted) return;
      this.submitted = true;
      this.listeners.forEach(function (fn) { fn(); });
    }
  };

  var PHONE_REGEX = /^(06|07)[0-9]{8}$/;
  var ERROR_EMPTY = 'هاد الخانة خاصها تعمر';
  var ERROR_PHONE = 'تأكد من رقم الهاتف — يبدأ بـ06 أو 07 ويتكوّن من 10 أرقام';

  function normalizePhone(value) {
    return (value || '').replace(/\s/g, '');
  }

  function setFieldError(input, errorEl, message) {
    if (message) {
      errorEl.textContent = message;
      input.setAttribute('aria-invalid', 'true');
    } else {
      errorEl.textContent = '';
      input.removeAttribute('aria-invalid');
    }
  }

  function validateForm(form) {
    var nameInput = form.querySelector('[name="name"]');
    var phoneInput = form.querySelector('[name="phone"]');
    var cityInput = form.querySelector('[name="city"]');
    var nameError = form.querySelector('.field-error[data-for="name"]');
    var phoneError = form.querySelector('.field-error[data-for="phone"]');
    var cityError = form.querySelector('.field-error[data-for="city"]');

    var valid = true;

    if (!nameInput.value.trim()) {
      setFieldError(nameInput, nameError, ERROR_EMPTY);
      valid = false;
    } else {
      setFieldError(nameInput, nameError, '');
    }

    var cleanPhone = normalizePhone(phoneInput.value);
    if (!PHONE_REGEX.test(cleanPhone)) {
      setFieldError(phoneInput, phoneError, ERROR_PHONE);
      valid = false;
    } else {
      setFieldError(phoneInput, phoneError, '');
    }

    if (!cityInput.value.trim()) {
      setFieldError(cityInput, cityError, ERROR_EMPTY);
      valid = false;
    } else {
      setFieldError(cityInput, cityError, '');
    }

    return valid;
  }

  function attachLiveValidation(form) {
    var fields = [
      { input: form.querySelector('[name="name"]'), key: 'name' },
      { input: form.querySelector('[name="phone"]'), key: 'phone' },
      { input: form.querySelector('[name="city"]'), key: 'city' }
    ];
    fields.forEach(function (f) {
      f.input.addEventListener('input', function () {
        var errorEl = form.querySelector('.field-error[data-for="' + f.key + '"]');
        if (!errorEl.textContent) return;
        if (f.key === 'phone') {
          if (PHONE_REGEX.test(normalizePhone(f.input.value))) setFieldError(f.input, errorEl, '');
        } else if (f.input.value.trim()) {
          setFieldError(f.input, errorEl, '');
        }
      });
    });
  }

  function generateEventId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'evt-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function showPostSubmitMessage(section) {
    var form = section.querySelector('.order-form');
    var message = section.querySelector('.post-submit-message');
    if (form) form.hidden = true;
    if (message) message.hidden = false;
  }

  function initOrderForm(formEl) {
    var section = formEl.closest('.order-form-section');
    attachLiveValidation(formEl);

    orderState.onSubmitted(function () {
      showPostSubmitMessage(section);
    });

    formEl.addEventListener('submit', function (event) {
      event.preventDefault();
      if (orderState.submitted) return;
      if (!validateForm(formEl)) return;

      var submitButton = formEl.querySelector('.order-submit');
      if (submitButton) submitButton.disabled = true;

      var eventId = generateEventId();
      var payload = {
        name: formEl.querySelector('[name="name"]').value.trim(),
        phone: normalizePhone(formEl.querySelector('[name="phone"]').value),
        city: formEl.querySelector('[name="city"]').value.trim(),
        website: formEl.querySelector('[name="website"]').value, // honeypot
        // TODO: Turnstile token verification goes here once site key is issued
        eventId: eventId
      };

      fetch('/api/submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (result.ok && result.data && result.data.ok) {
            if (typeof fbq === 'function') {
              fbq('track', 'Lead', { value: 249, currency: 'MAD' }, { eventID: result.data.eventId || eventId });
            }
            orderState.markSubmitted();
          } else {
            if (submitButton) submitButton.disabled = false;
          }
        })
        .catch(function () {
          if (submitButton) submitButton.disabled = false;
        });
    });
  }

  /* ==========================================================================
     Smooth scroll to the nearest (not-yet-submitted) order form
     ========================================================================== */

  function smoothScrollTo(targetY, duration) {
    var startY = window.scrollY;
    var distance = targetY - startY;
    var startTime = null;

    function easeInOutQuad(t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + distance * easeInOutQuad(progress));
      if (progress < 1) window.requestAnimationFrame(step);
    }

    window.requestAnimationFrame(step);
  }

  function scrollToNearestForm() {
    var sections = Array.prototype.slice.call(document.querySelectorAll('.order-form-section'));
    if (!sections.length) return;

    var viewportCenter = window.scrollY + window.innerHeight / 2;
    var nearest = sections.reduce(function (best, section) {
      var rect = section.getBoundingClientRect();
      var sectionCenter = window.scrollY + rect.top + rect.height / 2;
      var distance = Math.abs(sectionCenter - viewportCenter);
      if (!best || distance < best.distance) return { section: section, distance: distance };
      return best;
    }, null);

    if (nearest) {
      var targetY = window.scrollY + nearest.section.getBoundingClientRect().top;
      if (prefersReducedMotion()) {
        window.scrollTo(0, targetY);
      } else {
        smoothScrollTo(targetY, 500);
      }
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function initScrollCtas() {
    var ctas = document.querySelectorAll('[data-scroll-cta]');
    ctas.forEach(function (cta) {
      cta.addEventListener('click', function (event) {
        if (cta.tagName === 'A' && cta.getAttribute('href') && cta.getAttribute('href').indexOf('#') === 0) {
          event.preventDefault();
        }
        scrollToNearestForm();
      });
    });
  }

  /* ==========================================================================
     Sticky CTA bar — appears after the visitor scrolls past the ATF section
     ========================================================================== */

  function initStickyBar() {
    var bar = document.getElementById('sticky-cta-bar');
    var whatsappBubble = document.querySelector('.whatsapp-bubble');
    if (!bar) return;

    var threshold = 650;
    var ticking = false;

    function update() {
      ticking = false;
      if (orderState.submitted) return;
      var visible = window.scrollY > threshold;
      bar.hidden = false;
      bar.classList.toggle('is-visible', visible);
      if (whatsappBubble) whatsappBubble.classList.toggle('no-sticky-bar', !visible);
      document.body.classList.toggle('has-sticky-bar-space', visible);
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    orderState.onSubmitted(function () {
      bar.classList.remove('is-visible');
      bar.hidden = true;
      document.body.classList.remove('has-sticky-bar-space');
      if (whatsappBubble) whatsappBubble.classList.add('no-sticky-bar');
    });

    update();
  }

  /* ==========================================================================
     Init
     ========================================================================== */

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.order-form').forEach(initOrderForm);
    initScrollCtas();
    initStickyBar();
  });
})();
