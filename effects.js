(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Floating light particles (skip full-bleed photo heroes) ── */
  var skipAmbientHero = document.body.classList.contains('page-home') ||
    document.body.classList.contains('page-mission');
  if (!reducedMotion && !skipAmbientHero) {
    var heroEl = document.querySelector('.hero');
    var ambient = document.createElement('div');
    ambient.className = 'ambient-bg';
    ambient.setAttribute('aria-hidden', 'true');

    if (heroEl) {
      heroEl.insertBefore(ambient, heroEl.firstChild);
    } else {
      document.body.prepend(ambient);
    }

    function addParticle(opts) {
      var p = document.createElement('span');
      p.className = 'ambient-particle' +
        (opts.large ? ' ambient-particle--lg' : '') +
        (opts.soft ? ' ambient-particle--soft' : '') +
        ' ambient-particle--float';

      var size = opts.large ? (6 + Math.random() * 8) : (3 + Math.random() * 5);
      var opacity = opts.opacity != null ? opts.opacity : (0.2 + Math.random() * 0.35);

      p.style.cssText =
        'width:' + size + 'px;height:' + size + 'px;' +
        '--p-opacity:' + opacity + ';' +
        '--p-drift:0px;' +
        'left:' + (Math.random() * 100) + '%;' +
        'animation-duration:' + (opts.duration || (10 + Math.random() * 14)) + 's;' +
        'animation-delay:' + (Math.random() * (opts.delaySpread || 8)) + 's;';

      ambient.appendChild(p);
    }

    for (var i = 0; i < 28; i++) addParticle({});
  }

  /* ── Nav scroll effect + mobile menu ── */
  var nav = document.querySelector('nav');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('nav-scrolled', window.scrollY > 40);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');
    if (toggle && links) {
      var setMenuOpen = function (open) {
        links.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
      };
      setMenuOpen(false);
      toggle.addEventListener('click', function () {
        setMenuOpen(!links.classList.contains('open'));
      });
      links.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          setMenuOpen(false);
        });
      });
      window.addEventListener('resize', function () {
        if (window.innerWidth > 860) setMenuOpen(false);
      });
    }
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
    '.purpose-block',
    '.pillar',
    '.impact-outcomes li',
    '.impact-panel',
    '.stories-featured',
    '.story',
    '.mission-cta .section-title',
    '.mission-cta .section-body',
    '.mission-cta .hero-cta',
    '.page-section > *'
  ].join(',');

  document.querySelectorAll(revealSelectors).forEach(function (el) {
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
  });

  document.querySelectorAll(
    '.mission-grid, .programs-grid, .belen-stats, .impact-stats-row, .miracles-list, .explore-grid, .pillars-list, .stories-grid'
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
      { threshold: 0.08, rootMargin: '0px 0px -8% 0px' }
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
    var rounded = Math.round(n);
    // Keep years and small counts uncomma'd (2020 not 2,020)
    if (Math.abs(rounded) < 10000) return String(rounded);
    return rounded.toLocaleString('en-US');
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
