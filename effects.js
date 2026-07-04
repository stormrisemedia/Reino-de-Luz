(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Floating light particles ── */
  if (!reducedMotion) {
    var ambient = document.createElement('div');
    ambient.className = 'ambient-bg';
    ambient.setAttribute('aria-hidden', 'true');
    document.body.prepend(ambient);

    for (var i = 0; i < 28; i++) {
      var p = document.createElement('span');
      p.className = 'ambient-particle';
      var size = 2 + Math.random() * 4;
      p.style.cssText =
        'width:' + size + 'px;height:' + size + 'px;' +
        'left:' + (Math.random() * 100) + '%;' +
        '--p-opacity:' + (0.15 + Math.random() * 0.35) + ';' +
        'animation-duration:' + (12 + Math.random() * 18) + 's;' +
        'animation-delay:' + (Math.random() * 15) + 's;';
      ambient.appendChild(p);
    }
  }

  /* ── Hero parallax ── */
  var hero = document.querySelector('.hero');
  if (hero && !reducedMotion) {
    var heroRays = hero.querySelector('.hero-rays');
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (heroRays && y < window.innerHeight * 1.2) {
        heroRays.style.transform = 'translateY(' + (y * 0.22) + 'px)';
      }
    }, { passive: true });
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
