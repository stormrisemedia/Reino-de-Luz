/**
 * Live push notification opt-in for Reino de Luz.
 * Works with any .notify-btn / .notify-hint on the page.
 */
(function () {
  'use strict';

  var API = 'https://reino-de-luz-live.startekno.workers.dev';
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.notify-btn'));
  var hints = Array.prototype.slice.call(document.querySelectorAll('.notify-hint'));
  var banners = Array.prototype.slice.call(document.querySelectorAll('.notify-banner'));
  if (!buttons.length) return;

  var hasSw = 'serviceWorker' in navigator;
  var hasPush = 'PushManager' in window;
  var hasNotification = 'Notification' in window;
  var supported = hasSw && hasPush && hasNotification;
  var busy = false;

  function currentLang() {
    try {
      return localStorage.getItem('rdl-lang') || document.documentElement.lang || 'es';
    } catch (e) {
      return document.documentElement.lang || 'es';
    }
  }

  function t(es, en) {
    return currentLang() === 'en' ? en : es;
  }

  function isIos() {
    var ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  }

  function isInstalledApp() {
    if (window.navigator.standalone === true) return true;
    if (!window.matchMedia) return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches
    );
  }

  function needsIosInstall() {
    return isIos() && !isInstalledApp();
  }

  function setHint(es, en, isError) {
    hints.forEach(function (hint) {
      hint.textContent = t(es, en);
      hint.setAttribute('data-es', es);
      hint.setAttribute('data-en', en);
      hint.classList.toggle('is-error', !!isError);
    });
  }

  function setButton(on) {
    var es = on ? 'Desactivar notificaciones' : 'Avisarme cuando estemos en vivo';
    var en = on ? 'Turn off notifications' : 'Notify me when we go live';
    buttons.forEach(function (b) {
      b.classList.toggle('is-on', !!on);
      b.setAttribute('data-es', es);
      b.setAttribute('data-en', en);
      b.textContent = t(es, en);
    });
    banners.forEach(function (banner) {
      banner.classList.toggle('is-subscribed', !!on);
      if (banner.hasAttribute('data-hide-when-on')) {
        banner.hidden = !!on;
      }
    });
  }

  function setDisabled(disabled) {
    buttons.forEach(function (b) {
      b.disabled = !!disabled;
    });
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function waitForActiveWorker(reg, timeoutMs) {
    if (reg.active) return Promise.resolve(reg);
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error('Service worker timed out'));
      }, timeoutMs || 8000);

      function finish(ok, err) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (ok) resolve(reg);
        else reject(err || new Error('Service worker failed to activate'));
      }

      function watch(worker) {
        if (!worker) return;
        if (worker.state === 'activated') {
          finish(true);
          return;
        }
        worker.addEventListener('statechange', function () {
          if (worker.state === 'activated') finish(true);
          if (worker.state === 'redundant') finish(false);
        });
      }

      watch(reg.installing);
      watch(reg.waiting);
      navigator.serviceWorker.ready.then(function () {
        finish(true);
      }).catch(function (err) {
        finish(false, err);
      });
    });
  }

  async function getRegistration() {
    var reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await waitForActiveWorker(reg);
    return navigator.serviceWorker.ready;
  }

  async function getExistingSubscription() {
    if (!hasSw) return null;
    var reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg || !reg.active) return null;
    return reg.pushManager.getSubscription();
  }

  async function currentSubscription() {
    var reg = await getRegistration();
    return reg.pushManager.getSubscription();
  }

  function showIosInstallHint() {
    setButton(false);
    setDisabled(false);
    setHint(
      'En iPhone/iPad: toca Compartir → “Añadir a pantalla de inicio”, abre la app desde ahí, y luego pulsa este botón.',
      'On iPhone/iPad: tap Share → “Add to Home Screen”, open the app from there, then tap this button.',
      true
    );
  }

  async function refreshUi() {
    if (needsIosInstall()) {
      showIosInstallHint();
      return;
    }
    if (!supported) {
      setDisabled(true);
      setHint(
        'Tu navegador no admite notificaciones push.',
        'Your browser does not support push notifications.',
        true
      );
      return;
    }
    if (Notification.permission === 'denied') {
      setDisabled(true);
      setButton(false);
      setHint(
        'Las notificaciones están bloqueadas. Actívalas en Ajustes → Apps → Reino de Luz (o Chrome) → Notificaciones.',
        'Notifications are blocked. Enable them in Settings → Apps → Reino de Luz (or Chrome) → Notifications.',
        true
      );
      return;
    }
    setDisabled(false);
    try {
      var sub = Notification.permission === 'granted' ? await getExistingSubscription() : null;
      if (Notification.permission === 'granted' && !sub) {
        sub = await currentSubscription();
      }
      setButton(!!sub);
      if (sub) {
        setHint(
          'Listo. Te avisaremos en este dispositivo cuando estemos en vivo.',
          "You're set. We'll alert this device when we go live."
        );
      } else {
        setHint(
          'Recibirás un aviso en este dispositivo cuando la transmisión comience.',
          "You'll get an alert on this device when the stream starts."
        );
      }
    } catch (e) {
      setDisabled(false);
      setHint(
        'No se pudieron preparar las notificaciones. Intenta de nuevo.',
        'Could not set up notifications. Please try again.',
        true
      );
    }
  }

  async function subscribeWithPermission() {
    var permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      setHint(
        permission === 'denied'
          ? 'Las notificaciones están bloqueadas. Actívalas en Ajustes → Apps → Reino de Luz (o Chrome) → Notificaciones.'
          : 'Necesitamos tu permiso para enviarte avisos.',
        permission === 'denied'
          ? 'Notifications are blocked. Enable them in Settings → Apps → Reino de Luz (or Chrome) → Notifications.'
          : 'We need your permission to send alerts.',
        true
      );
      if (permission === 'denied') setDisabled(true);
      return;
    }

    var keyRes = await fetch(API + '/vapid-public-key');
    if (!keyRes.ok) throw new Error('VAPID fetch failed');
    var keyData = await keyRes.json();
    if (!keyData.publicKey) throw new Error('Missing VAPID key');

    var reg = await getRegistration();
    var sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
    });

    var res = await fetch(API + '/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    });
    if (!res.ok) throw new Error('Subscribe failed');
    setButton(true);
    setHint(
      'Listo. Te avisaremos en este dispositivo cuando estemos en vivo.',
      "You're set. We'll alert this device when we go live."
    );
  }

  async function unsubscribe() {
    var sub = await currentSubscription();
    if (sub) {
      try {
        await fetch(API + '/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      } catch (e) {}
      await sub.unsubscribe();
    }
    setButton(false);
    setHint(
      'Notificaciones desactivadas en este dispositivo.',
      'Notifications turned off on this device.'
    );
  }

  async function onClick() {
    if (busy) return;
    if (needsIosInstall()) {
      showIosInstallHint();
      return;
    }
    if (!supported) {
      setHint(
        'Tu navegador no admite notificaciones push.',
        'Your browser does not support push notifications.',
        true
      );
      return;
    }
    busy = true;
    setDisabled(true);
    try {
      if (Notification.permission === 'granted') {
        var existing = await getExistingSubscription();
        if (!existing) existing = await currentSubscription();
        if (existing) await unsubscribe();
        else await subscribeWithPermission();
      } else {
        await subscribeWithPermission();
      }
    } catch (e) {
      setHint(
        'No se pudo actualizar las notificaciones. Intenta de nuevo.',
        'Could not update notifications. Please try again.',
        true
      );
    } finally {
      busy = false;
      setDisabled(hasNotification && Notification.permission === 'denied');
      refreshUi();
    }
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', onClick);
  });
  refreshUi();
})();
