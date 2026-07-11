/**
 * Shared live-status poller for the nav "En Vivo" badge (and optional page handlers).
 * Set window.RdlLiveStatusHandler = function (isLive) { ... } before this script runs
 * to receive updates (used by en-vivo.html for the player).
 */
(function () {
  'use strict';

  var LIVE_STATUS_URL = 'https://reino-de-luz-live.startekno.workers.dev';
  var CACHE_KEY = 'rdl-live-status';
  var CACHE_MS = 2 * 60 * 1000;
  var checking = false;

  function apply(isLive) {
    var liveBtn = document.querySelector('.nav-live');
    if (liveBtn) liveBtn.classList.toggle('is-live', !!isLive);
    if (typeof window.RdlLiveStatusHandler === 'function') {
      try {
        window.RdlLiveStatusHandler(!!isLive);
      } catch (e) {}
    }
  }

  function readCache() {
    try {
      var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && typeof cached.live === 'boolean' && typeof cached.t === 'number') {
        return cached;
      }
    } catch (e) {}
    return null;
  }

  function writeCache(live) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), live: !!live }));
    } catch (e) {}
  }

  function fetchStatus() {
    if (!LIVE_STATUS_URL || checking) return;
    checking = true;
    fetch(LIVE_STATUS_URL)
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var live = !!(data && data.live);
        apply(live);
        writeCache(live);
      })
      .catch(function () {
        /* keep last known UI state on network errors */
      })
      .finally(function () {
        checking = false;
      });
  }

  var cached = readCache();
  if (cached) apply(cached.live);

  var cacheAge = cached ? Date.now() - cached.t : Infinity;
  if (cacheAge >= CACHE_MS) {
    fetchStatus();
  } else {
    setTimeout(fetchStatus, CACHE_MS - cacheAge);
  }

  setInterval(fetchStatus, CACHE_MS);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') fetchStatus();
  });
})();
