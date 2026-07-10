(function () {
  'use strict';

  /* ── Normalize nav: Donate then language toggle at the far right ── */
  (function normalizeNav() {
    var nav = document.querySelector('nav');
    if (!nav) return;

    var navLinks = nav.querySelector('.nav-links');
    var navActions = nav.querySelector('.nav-actions');
    if (!navActions) return;

    var langInLinks = navLinks && navLinks.querySelector('.lang-toggle');
    if (langInLinks) {
      navActions.appendChild(langInLinks);
    }

    if (navLinks) {
      navLinks.querySelectorAll('li').forEach(function (li) {
        if (!li.querySelector('a, button, .lang-toggle')) {
          li.remove();
        }
      });
    }

    var donate = navActions.querySelector('.nav-donate');
    var live = navActions.querySelector('.nav-live');
    var lang = navActions.querySelector('.lang-toggle');
    if (donate) navActions.appendChild(donate);
    if (live) navActions.appendChild(live);
    if (lang) navActions.appendChild(lang);
  })();

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Floating light particles (skip home hero) ── */
  if (!reducedMotion && !document.body.classList.contains('page-home')) {
    var isHome = false;
    var heroEl = document.querySelector('.hero');
    var ambient = document.createElement('div');
    ambient.className = 'ambient-bg' + (isHome ? ' ambient-bg--home ambient-bg--hero' : '');
    ambient.setAttribute('aria-hidden', 'true');

    if (heroEl) {
      heroEl.insertBefore(ambient, heroEl.firstChild);
    } else {
      document.body.prepend(ambient);
    }

    function addParticle(opts) {
      var p = document.createElement('span');
      var spark = !!opts.spark;
      p.className = 'ambient-particle' +
        (opts.large ? ' ambient-particle--lg' : '') +
        (opts.soft ? ' ambient-particle--soft' : '') +
        (spark ? ' ambient-particle--spark' : ' ambient-particle--float');

      var size;
      if (isHome) {
        size = opts.large ? (5 + Math.random() * 6) : spark ? (3 + Math.random() * 4) : (3 + Math.random() * 5);
      } else {
        size = opts.large ? (6 + Math.random() * 8) : (3 + Math.random() * 5);
      }

      var drift = isHome ? ((Math.random() * 50 - 25).toFixed(1) + 'px') : '0px';
      var opacity = opts.opacity;
      if (opacity == null) {
        opacity = isHome ? (0.45 + Math.random() * 0.45) : (0.2 + Math.random() * 0.35);
      }

      var style =
        'width:' + size + 'px;height:' + size + 'px;' +
        '--p-opacity:' + opacity + ';' +
        '--p-drift:' + drift + ';';

      if (spark) {
        style += 'left:' + (5 + Math.random() * 90) + '%;top:' + (8 + Math.random() * 84) + '%;';
        style += 'animation-duration:' + (3 + Math.random() * 4) + 's;';
        style += 'animation-delay:' + (Math.random() * 2) + 's;';
      } else {
        style += 'left:' + (Math.random() * 100) + '%;';
        style += 'animation-duration:' + (opts.duration || (10 + Math.random() * 14)) + 's;';
        style += 'animation-delay:' + (Math.random() * (opts.delaySpread || 8)) + 's;';
      }

      p.style.cssText = style;
      ambient.appendChild(p);
    }

    var count = isHome ? 45 : 28;
    for (var i = 0; i < count; i++) addParticle({});

    if (isHome) {
      for (var j = 0; j < 14; j++) {
        addParticle({
          large: true,
          opacity: 0.3 + Math.random() * 0.25,
          duration: 12 + Math.random() * 16,
          delaySpread: 6
        });
      }
      for (var k = 0; k < 28; k++) {
        addParticle({
          spark: true,
          opacity: 0.4 + Math.random() * 0.3
        });
      }
    }
  }

  /* ── Nav scroll effect ── */
  var nav = document.querySelector('nav');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('nav-scrolled', window.scrollY > 40);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── Scroll reveal ── */
  var revealSelectors = [
    '.section-label',
    '.section-title',
    '.section-body',
    '.mission-card',
    '.vm-card',
    '.prog-card',
    '.stat-card',
    '.miracle-item',
    '.origin-declaration',
    '.origin-closing',
    '.belen-callout',
    '.founder-card',
    '.scripture-pull',
    '.calling-box',
    '.tl-item',
    '.impact-hero-num',
    '.impact-stat',
    '.impact-tags',
    '.budget-summary',
    '.channel-card',
    '.embed-wrapper',
    '.livestream-meta',
    '.connect-form',
    '.schedule-list li',
    '.gallery-item',
    '.donate-card',
    '.explore-card',
    '.page-section > *'
  ].join(',');

  document.querySelectorAll(revealSelectors).forEach(function (el) {
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
  });

  document.querySelectorAll(
    '.mission-grid, .programs-grid, .belen-stats, .impact-stats-row, .miracles-list, .explore-grid'
  ).forEach(function (grid) {
    grid.classList.add('reveal-stagger');
  });

  if (!reducedMotion && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal').forEach(function (el) {
      observer.observe(el);
    });

    document.querySelectorAll('.tl-marker.tl-gold').forEach(function (marker) {
      var markerObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              markerObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      markerObserver.observe(marker);
    });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* ── Animated counters ── */
  function parseNumber(text) {
    var raw = (text || '').trim();
    if (raw === '∞') return { type: 'symbol', value: '∞' };
    var cleaned = raw.replace(/,/g, '');
    var match = cleaned.match(/^(\D*)([\d.]+)(\D*)$/);
    if (!match) return null;
    return {
      prefix: match[1] || '',
      value: parseFloat(match[2]),
      suffix: match[3] || '',
      decimals: (match[2].split('.')[1] || '').length
    };
  }

  function formatNumber(n, decimals) {
    if (decimals > 0) return n.toFixed(decimals);
    return Math.round(n).toLocaleString('en-US');
  }

  function animateCounter(el) {
    var parsed = parseNumber(el.textContent);
    if (!parsed) return;
    if (parsed.type === 'symbol') {
      el.classList.add('is-counted');
      return;
    }

    var duration = 1400;
    var start = null;

    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = parsed.value * eased;
      el.textContent = parsed.prefix + formatNumber(current, parsed.decimals) + parsed.suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = parsed.prefix + formatNumber(parsed.value, parsed.decimals) + parsed.suffix;
        el.classList.add('is-counted');
      }
    }

    el.textContent = parsed.prefix + '0' + parsed.suffix;
    requestAnimationFrame(step);
  }

  if (!reducedMotion && 'IntersectionObserver' in window) {
    var counterObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );

    document.querySelectorAll(
      '.stat-num, .impact-big, .impact-stat-num, .origin-years-num'
    ).forEach(function (el) {
      counterObserver.observe(el);
    });
  }
})();
