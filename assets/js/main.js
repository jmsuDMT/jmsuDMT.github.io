/* ============================================================
   DMT 社团 · 海报站
   所有文字和图片路径都来自 content/content.json，改内容只改那个文件。
   ============================================================ */
(function () {
  'use strict';

  var ICONS = {
    algo:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="4.5" r="2"/><circle cx="4.5" cy="19.5" r="2"/><circle cx="19.5" cy="19.5" r="2"/>' +
      '<path d="M12 6.5v4.5M12 11H5.6l-.9 6.6M12 11h6.4l.9 6.6"/></svg>',
    chip:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="6.5" y="6.5" width="11" height="11"/><rect x="10" y="10" width="4" height="4"/>' +
      '<path d="M9.5 3v3.5M14.5 3v3.5M9.5 17.5V21M14.5 17.5V21M3 9.5h3.5M3 14.5h3.5M17.5 9.5H21M17.5 14.5H21"/></svg>',
    shield:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z"/>' +
      '<path d="M9 12.2l2.1 2.1L15.4 10"/></svg>',
    branch:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="7" cy="5" r="2"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="9" r="2"/>' +
      '<path d="M7 7v10M9 17.4c4.4 0 6-2.2 6-6.4"/></svg>'
  };

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /* ---------- 渲染 ---------- */

  function renderTop(data) {
    document.title = data.site.name;
    $('brand-text').textContent = data.site.short || data.site.name;

    var nav = $('nav');
    nav.innerHTML = '';
    (data.nav || []).forEach(function (item) {
      var a = el('a', '', esc(item.label));
      a.href = item.href;
      nav.appendChild(a);
    });

    $('hero-eyebrow').textContent = data.hero.eyebrow || '';
    var title = $('hero-title');
    title.innerHTML = '';
    (data.hero.title || []).forEach(function (line, i) {
      var span = el('span', i === 0 ? 'outline' : 'solid', esc(line));
      title.appendChild(span);
    });
    $('hero-lead').textContent = data.hero.lead || '';
    $('hero-sub').textContent = data.hero.sub || '';
    var hint = $('scroll-hint');
    hint.querySelector('.scroll-label').textContent = data.hero.scroll || '向下滚动';
    $('footer-text').textContent = data.site.footer || data.site.name;
  }

  function renderDirections(data) {
    var block = data.directions || {};
    $('what-title').textContent = block.title || '我们做什么';
    $('what-note').textContent = block.note || '';
    var list = $('direction-list');
    list.innerHTML = '';
    (block.items || []).forEach(function (item, i) {
      var card = el('article', 'card');
      card.innerHTML =
        '<span class="card-index">' + pad2(i + 1) + '</span>' +
        '<div class="card-icon">' + (ICONS[item.icon] || ICONS.algo) + '</div>' +
        '<h3>' + esc(item.title) + '</h3>' +
        '<p>' + esc(item.desc) + '</p>';
      card.classList.add('reveal');
      list.appendChild(card);
    });
  }

  function renderWorks(data) {
    var block = data.projects || {};
    $('works-title').textContent = block.title || '作品墙';
    $('works-note').textContent = block.note || '';
    var list = $('work-list');
    list.innerHTML = '';

    (block.items || []).forEach(function (item) {
      var card = el('button', 'work');
      card.type = 'button';
      card.setAttribute('aria-label', '查看 ' + item.name);
      var tags = (item.tags || []).map(function (t) {
        return '<span class="tag">' + esc(t) + '</span>';
      }).join('');
      var thumb = item.image
        ? '<img src="' + esc(item.image) + '" alt="' + esc(item.name) + '" loading="lazy">'
        : '<div class="thumb-empty" aria-hidden="true"></div>';
      card.innerHTML =
        '<div class="work-thumb">' + thumb + '</div>' +
        '<div class="work-body"><h3>' + esc(item.name) + '</h3>' +
        '<p>' + esc(item.summary) + '</p><div class="tags">' + tags + '</div></div>';
      card.addEventListener('click', function () { openDetail(item); });
      card.classList.add('reveal');
      list.appendChild(card);
    });
  }

  function renderTimeline(data) {
    var block = data.timeline || {};
    $('timeline-title').textContent = block.title || '一路走来';
    $('timeline-note').textContent = block.note || '';
    var list = $('timeline-list');
    list.innerHTML = '';
    (block.items || []).forEach(function (item) {
      var li = el('li', 'tl-item reveal');
      li.innerHTML =
        '<div class="tl-year">' + esc(item.year) + '</div>' +
        '<h3 class="tl-title">' + esc(item.title) + '</h3>' +
        '<p class="tl-desc">' + esc(item.desc) + '</p>';
      list.appendChild(li);
    });
  }

  function renderJoin(data) {
    var join = data.join || {};
    var members = data.members || {};
    $('join-title').textContent = join.title || '加入我们';
    $('join-lead').textContent = join.lead || '';
    $('members-title').textContent = members.title || '现任成员';
    $('members-note').textContent = members.note || '';

    var mlist = $('member-list');
    mlist.innerHTML = '';
    (members.items || []).forEach(function (m) {
      var li = el('li', 'member');
      li.innerHTML =
        '<div class="avatar">' + esc(m.initial || String(m.name || '').slice(0, 1)) + '</div>' +
        '<div><div class="member-name">' + esc(m.name) + '</div>' +
        '<div class="member-role">' + esc(m.role) + '</div></div>';
      mlist.appendChild(li);
    });

    var block = $('join-block');
    var rows = (join.items || []).map(function (it) {
      return '<li><span class="k">' + esc(it.label) + '</span>' +
        '<span class="v">' + esc(it.value) + '</span>' +
        '<span class="n">' + esc(it.note || '') + '</span></li>';
    }).join('');
    block.innerHTML =
      '<div><ul class="join-list">' + rows + '</ul></div>' +
      ('<div class="qr">' +
        (join.qrcode
          ? '<img src="' + esc(join.qrcode) + '" alt="' + esc(join.qrcodeNote || '二维码') + '">'
          : '<div class="qr-empty" aria-hidden="true"></div>') +
        '<span>' + esc(join.qrcodeNote || '') + '</span></div>');
  }

  /* ---------- 作品详情 ---------- */

  var overlay = null;
  var lastFocus = null;

  function openDetail(item) {
    if (!overlay) overlay = $('overlay');
    lastFocus = document.activeElement;

    $('overlay-title').textContent = item.name;
    $('overlay-desc').textContent = item.detail || item.summary || '';

    var imgBox = $('overlay-image');
    imgBox.innerHTML = item.image
      ? '<img src="' + esc(item.image) + '" alt="' + esc(item.name) + '">'
      : '<div class="thumb-empty" aria-hidden="true"></div>';

    var meta = $('overlay-meta');
    meta.innerHTML = (item.meta || []).map(function (row) {
      return '<li><span class="k">' + esc(row[0]) + '</span><span class="v">' + esc(row[1]) + '</span></li>';
    }).join('');

    $('overlay-tags').innerHTML = (item.tags || []).map(function (t) {
      return '<span class="tag">' + esc(t) + '</span>';
    }).join('');

    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    $('overlay-close').focus();
  }

  function closeDetail() {
    if (!overlay) overlay = $('overlay');
    overlay.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function bindOverlay() {
    $('overlay-close').addEventListener('click', closeDetail);
    $('overlay').addEventListener('click', function (e) {
      if (e.target === $('overlay')) closeDetail();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('overlay').hidden) closeDetail();
    });
  }

  /* ---------- 滚动渐入 ---------- */

  function observeReveals() {
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(items, function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(items, function (n) { io.observe(n); });
  }

  /* ---------- 启动 ---------- */

  function boot(data) {
    renderTop(data);
    renderDirections(data);
    renderWorks(data);
    renderTimeline(data);
    renderJoin(data);
    bindOverlay();
    observeReveals();
  }

  function fail() {
    document.body.innerHTML =
      '<div class="noscript">内容没加载出来（content/content.json）。<br>' +
      '直接双击打开 html 文件的话浏览器会拦 fetch，用本地服务器预览即可。</div>';
  }

  fetch('content/content.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(boot)
    .catch(function (e) {
      console.error(e);
      fail();
    });
})();
