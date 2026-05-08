/**
 * Ambient Space — embed widget v1.
 *
 * Drop-in widget for real-estate platforms and retailers. Partners paste:
 *
 *   <div data-ambient-embed
 *        data-source="https://listing.com/photo.jpg"
 *        data-key="ams_live_xxx"
 *        data-styles="japandi,scandinavian,industrial"></div>
 *   <script src="https://www.ambientspace.ai/embed.js" defer></script>
 *
 * On load, the script:
 *   1. Finds every <div data-ambient-embed>.
 *   2. Renders a thumbnail grid of styles next to the original photo.
 *   3. On click, calls /api/embed/generate with the partner's API key.
 *   4. Shows a before/after slider when the result lands.
 *
 * No bundler. No React. ~5KB minified. Self-contained styles via inline CSS.
 *
 * v1 limitations (intentional, ship-fast):
 *   - No bundling/minification step yet — we serve this as plain JS.
 *   - Styles list is hardcoded to 8 presets; partners can override via
 *     data-styles="japandi,art-deco" attribute.
 *   - One render per click (no slider, no batch). Partners hit their quota
 *     via the partner_keys table on each click.
 */
(function () {
  'use strict';

  var API_BASE = 'https://www.ambientspace.ai/api/embed/generate';
  var DEFAULT_STYLES = ['Japandi', 'Scandinavian', 'Mid-century', 'Industrial', 'Bohemian', 'Minimalist', 'Coastal', 'Art Deco'];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'style' && typeof attrs[k] === 'object') Object.assign(node.style, attrs[k]);
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function injectStyles() {
    if (document.getElementById('ambient-embed-styles')) return;
    var s = document.createElement('style');
    s.id = 'ambient-embed-styles';
    s.textContent = [
      '.ambient-embed{font-family:system-ui,-apple-system,sans-serif;color:#0A0A12;max-width:680px;margin:24px 0;}',
      '.ambient-embed-header{display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:13px;color:#666;}',
      '.ambient-embed-header b{color:#1B8FA0;}',
      '.ambient-embed-photo{position:relative;border-radius:12px;overflow:hidden;background:#eee;aspect-ratio:4/3;}',
      '.ambient-embed-photo img{width:100%;height:100%;object-fit:cover;display:block;}',
      '.ambient-embed-photo-loading{position:absolute;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:600;}',
      '.ambient-embed-styles{display:flex;gap:8px;overflow-x:auto;padding:12px 0;}',
      '.ambient-embed-style-btn{flex:0 0 auto;padding:8px 16px;border-radius:999px;border:1px solid #ddd;background:white;font-size:13px;font-weight:600;cursor:pointer;color:#333;transition:all 0.15s;white-space:nowrap;}',
      '.ambient-embed-style-btn:hover{border-color:#1B8FA0;color:#1B8FA0;}',
      '.ambient-embed-style-btn[data-active="true"]{background:#1B8FA0;color:white;border-color:#1B8FA0;}',
      '.ambient-embed-style-btn:disabled{opacity:0.5;cursor:not-allowed;}',
      '.ambient-embed-credit{margin-top:8px;font-size:11px;color:#999;text-align:right;}',
      '.ambient-embed-credit a{color:#999;text-decoration:none;}',
      '.ambient-embed-credit a:hover{color:#1B8FA0;}',
      '.ambient-embed-error{margin-top:8px;padding:8px 12px;border-radius:8px;background:#fee;color:#c33;font-size:13px;}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function mount(container) {
    var sourceUrl = container.getAttribute('data-source');
    var apiKey = container.getAttribute('data-key');
    var stylesAttr = container.getAttribute('data-styles');
    var styles = stylesAttr ? stylesAttr.split(',').map(function (s) { return s.trim(); }) : DEFAULT_STYLES;

    if (!sourceUrl || !apiKey) {
      container.appendChild(el('div', { class: 'ambient-embed-error' }, [
        'Ambient Space embed: missing data-source or data-key attribute.',
      ]));
      return;
    }

    var imgEl = el('img', { src: sourceUrl, alt: 'Listing photo' });
    var loadingOverlay = el('div', { class: 'ambient-embed-photo-loading', style: { display: 'none' } }, ['Generating…']);
    var photoEl = el('div', { class: 'ambient-embed-photo' }, [imgEl, loadingOverlay]);

    var stylesEl = el('div', { class: 'ambient-embed-styles' });
    var errorEl = null;
    var activeBtn = null;

    function setLoading(loading) {
      loadingOverlay.style.display = loading ? 'flex' : 'none';
      $$('.ambient-embed-style-btn', stylesEl).forEach(function (b) { b.disabled = loading; });
    }

    function showError(msg) {
      if (errorEl) errorEl.remove();
      errorEl = el('div', { class: 'ambient-embed-error' }, [msg]);
      container.appendChild(errorEl);
    }

    styles.forEach(function (style) {
      var btn = el('button', { class: 'ambient-embed-style-btn', type: 'button' }, [style]);
      btn.addEventListener('click', function () {
        if (activeBtn) activeBtn.setAttribute('data-active', 'false');
        btn.setAttribute('data-active', 'true');
        activeBtn = btn;
        if (errorEl) { errorEl.remove(); errorEl = null; }
        setLoading(true);

        fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Ambient-Key': apiKey },
          body: JSON.stringify({ source_url: sourceUrl, style: style, brief: '' }),
        })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
          .then(function (resp) {
            if (!resp.ok) {
              showError(resp.body.error || 'Generation failed');
            } else if (resp.body && resp.body.url) {
              imgEl.src = resp.body.url;
            }
          })
          .catch(function () { showError('Network error — please retry'); })
          .finally(function () { setLoading(false); });
      });
      stylesEl.appendChild(btn);
    });

    var header = el('div', { class: 'ambient-embed-header' }, [
      'Try this room in different styles — powered by ',
      el('b', null, ['Ambient Space']),
    ]);
    var credit = el('div', { class: 'ambient-embed-credit' }, [
      el('a', { href: 'https://www.ambientspace.ai', target: '_blank', rel: 'noopener' }, ['Ambient Space →']),
    ]);

    container.classList.add('ambient-embed');
    container.appendChild(header);
    container.appendChild(photoEl);
    container.appendChild(stylesEl);
    container.appendChild(credit);
  }

  function init() {
    injectStyles();
    $$('[data-ambient-embed]').forEach(mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
