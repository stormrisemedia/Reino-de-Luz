/**
 * Safe bilingual content updates for static data-es / data-en attributes.
 * Allows only a small set of presentational tags used in page copy.
 */
(function (global) {
  'use strict';

  var ALLOWED_TAGS = {
    SPAN: true,
    BR: true,
    STRONG: true,
    EM: true,
    B: true,
    I: true,
    A: true,
    CITE: true,
  };

  function isSafeHref(href) {
    if (!href || typeof href !== 'string') return false;
    var value = href.trim();
    if (!value || /^javascript:/i.test(value) || /^data:/i.test(value) || /^vbscript:/i.test(value)) {
      return false;
    }
    try {
      var url = new URL(value, global.location.origin);
      if (url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'mailto:') {
        return true;
      }
      // Same-site relative paths (contacto.html, #impacto, etc.)
      if (url.origin === global.location.origin) return true;
    } catch (e) {
      return false;
    }
    return false;
  }

  function sanitizeNode(node) {
    if (node.nodeType === 3) return node.cloneNode(false); // text
    if (node.nodeType !== 1) return null;

    var tag = node.tagName;
    if (!ALLOWED_TAGS[tag]) {
      // Keep text content of disallowed elements, drop the wrapper.
      var frag = document.createDocumentFragment();
      Array.prototype.forEach.call(node.childNodes, function (child) {
        var clean = sanitizeNode(child);
        if (clean) frag.appendChild(clean);
      });
      return frag;
    }

    var el = document.createElement(tag.toLowerCase());
    if (tag === 'A') {
      var href = node.getAttribute('href');
      if (isSafeHref(href)) {
        el.setAttribute('href', href);
        var target = node.getAttribute('target');
        if (target === '_blank') {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer');
        }
      }
    } else if (tag === 'SPAN' || tag === 'STRONG' || tag === 'EM' || tag === 'B' || tag === 'I' || tag === 'CITE') {
      var className = node.getAttribute('class');
      if (className && /^[a-zA-Z0-9 _-]+$/.test(className)) {
        el.className = className;
      }
    }

    Array.prototype.forEach.call(node.childNodes, function (child) {
      var clean = sanitizeNode(child);
      if (clean) el.appendChild(clean);
    });
    return el;
  }

  function safeSetHtml(el, html) {
    if (!el) return;
    if (html == null || html === '') {
      el.textContent = '';
      return;
    }
    if (!/[<>]/.test(html)) {
      el.textContent = html;
      return;
    }

    var parsed = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    var wrap = parsed.body && parsed.body.firstChild;
    el.textContent = '';
    if (!wrap) {
      el.textContent = html.replace(/<[^>]*>/g, '');
      return;
    }
    Array.prototype.forEach.call(wrap.childNodes, function (child) {
      var clean = sanitizeNode(child);
      if (clean) el.appendChild(clean);
    });
  }

  global.rdlSafeSetHtml = safeSetHtml;
})(window);
