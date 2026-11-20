/* ============================================================
 * 佳木斯大学 DMT 社团 · 社团入口 / 个人中心 / 管理面板
 * ------------------------------------------------------------
 * 数据来源：
 *   data/members.json        基础成员表（pass 存 sha256）
 *   GitHub Issues            运行时数据，由 jmsuDMT 账号创建
 *     [公告] 标题   正文 = 公告内容，open 显示 / closed 隐藏
 *     [成员] 姓名   正文 = 身份 / 角色 / 密码
 *     [密码] 姓名   正文 = 新密码哈希
 *     [移除] 姓名
 * 这样做的好处：写公告、加成员都不需要令牌，管理员点按钮跳到
 * GitHub 预填页，提交一下，全站所有设备立刻读到。
 * ============================================================ */
(function () {
  'use strict';

  var REPO_SLUG = 'jmsuDMT/jmsuDMT.github.io';
  var OWNER_LOGIN = 'jmsudmt';
  var API = 'https://api.github.com/repos/' + REPO_SLUG;
  var ISSUE_NEW = 'https://github.com/' + REPO_SLUG + '/issues/new';
  var SESSION_KEY = 'jmsu_session';
  var LOCAL_PW_KEY = 'jmsu_local_pw';
  var SESSION_HOURS = 12;

  /* ---------------- sha256 ---------------- */

  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  function utf8Bytes(str) {
    var enc = unescape(encodeURIComponent(str));
    var out = new Uint8Array(enc.length);
    for (var i = 0; i < enc.length; i++) out[i] = enc.charCodeAt(i) & 0xff;
    return out;
  }

  function sha256(text) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
             0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var bytes = utf8Bytes(String(text));
    var len = bytes.length;
    var blocks = Math.ceil((len + 9) / 64);
    var total = blocks * 64;
    var buf = new Uint8Array(total);
    buf.set(bytes);
    buf[len] = 0x80;

    var bits = len * 8;
    var hi = Math.floor(bits / 0x100000000);
    var lo = bits >>> 0;
    buf[total - 8] = (hi >>> 24) & 255;
    buf[total - 7] = (hi >>> 16) & 255;
    buf[total - 6] = (hi >>> 8) & 255;
    buf[total - 5] = hi & 255;
    buf[total - 4] = (lo >>> 24) & 255;
    buf[total - 3] = (lo >>> 16) & 255;
    buf[total - 2] = (lo >>> 8) & 255;
    buf[total - 1] = lo & 255;

    var w = new Uint32Array(64);
    for (var b = 0; b < blocks; b++) {
      var off = b * 64;
      for (var i = 0; i < 16; i++) {
        w[i] = (buf[off + i * 4] << 24) | (buf[off + i * 4 + 1] << 16) |
               (buf[off + i * 4 + 2] << 8) | buf[off + i * 4 + 3];
      }
      for (i = 16; i < 64; i++) {
        var x = w[i - 15], y = w[i - 2];
        var s0 = (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0;
        var s1 = (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10)) >>> 0;
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      var a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
        var ch = ((e & f) ^ (~e & g)) >>> 0;
        var t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        var S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
        var maj = ((a & bb) ^ (a & c) ^ (bb & c)) >>> 0;
        var t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e;
        e = (d + t1) >>> 0;
        d = c; c = bb; bb = a;
        a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + bb) >>> 0;
      H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    var hex = '';
    for (var k = 0; k < 8; k++) hex += ('00000000' + H[k].toString(16)).slice(-8);
    return hex;
  }

  /* ---------------- 工具 ---------------- */

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html !== undefined) d.innerHTML = html;
    return d;
  }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function timeText(d) {
    d = d instanceof Date ? d : new Date(d);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
           ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function dateText(d) {
    d = d instanceof Date ? d : new Date(d);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* ---------------- 会话 ---------------- */

  function readSession() {
    try {
      var s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!s || !s.name || !s.exp || s.exp < Date.now()) return null;
      return s;
    } catch (e) { return null; }
  }

  function writeSession(m) {
    var s = {
      name: m.name,
      role: m.role || 'member',
      title: m.title || '',
      exp: Date.now() + SESSION_HOURS * 3600 * 1000
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
  }

  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  function readLocalPw() {
    try { return JSON.parse(localStorage.getItem(LOCAL_PW_KEY) || '{}') || {}; } catch (e) { return {}; }
  }

  function writeLocalPw(name, hash) {
    var map = readLocalPw();
    var k = String(name || '').toLowerCase();
    if (!hash) delete map[k]; else map[k] = hash;
    localStorage.setItem(LOCAL_PW_KEY, JSON.stringify(map));
  }

  /* ---------------- 数据：成员表 + Issues ---------------- */

  var dataCache = null;
  var dataAt = 0;

  function fetchBaseMembers() {
    return fetch('/data/members.json?t=' + Date.now())
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return (d && d.members) || []; })
      .catch(function () { return []; });
  }

  function fetchOps() {
    return fetch(API + '/issues?state=all&per_page=100&sort=created&direction=asc', {
      headers: { 'Accept': 'application/vnd.github+json' }
    }).then(function (r) { return r.ok ? r.json() : []; })
      .then(function (list) {
        return (list || []).filter(function (x) {
          return x && x.user && String(x.user.login).toLowerCase() === OWNER_LOGIN && !x.pull_request;
        }).map(function (x) {
          var m = String(x.title || '').trim().match(/^\[(公告|成员|密码|移除)\]\s*([\s\S]*)$/);
          if (!m) return null;
          return {
            kind: m[1],
            title: m[2].trim(),
            body: x.body || '',
            number: x.number,
            state: x.state,
            url: x.html_url,
            created: x.created_at
          };
        }).filter(Boolean);
      })
      .catch(function () { return []; });
  }

  function loadData(force) {
    if (!force && dataCache && Date.now() - dataAt < 60000) return Promise.resolve(dataCache);
    return Promise.all([fetchBaseMembers(), fetchOps()]).then(function (res) {
      var members = mergeMembers(res[0], res[1]);
      var anns = mergeAnns(res[1]);
      dataCache = { members: members, anns: anns, ops: res[1] };
      dataAt = Date.now();
      return dataCache;
    });
  }

  function findByName(list, name) {
    var n = String(name || '').trim().toLowerCase();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].name || '').trim().toLowerCase() === n) return list[i];
    }
    return null;
  }

  function parseMeta(body) {
    var out = {};
    String(body || '').split(/\r?\n/).forEach(function (line) {
      var i = line.indexOf('：');
      var j = line.indexOf(':');
      var idx = i >= 0 && (j < 0 || i < j) ? i : j;
      if (idx < 0) return;
      var k = line.slice(0, idx).trim();
      var v = line.slice(idx + 1).trim();
      if (!v) return;
      if (k === '身份') out.title = v;
      if (k === '角色') out.role = v === 'admin' ? 'admin' : 'member';
      if (k === '密码') out.pass = v;
    });
    return out;
  }

  function mergeMembers(base, ops) {
    var list = (base || []).map(function (m) { return Object.assign({}, m); });
    (ops || []).forEach(function (o) {
      if (o.state !== 'open') return;   /* 关掉的申请等于撤销 */
      var name = o.title;
      if (!name) return;
      if (o.kind === '成员') {
        var meta = parseMeta(o.body);
        var hit = findByName(list, name);
        if (hit) {
          if (meta.title) hit.title = meta.title;
          if (meta.role) hit.role = meta.role;
          if (meta.pass) hit.pass = meta.pass;
        } else {
          list.push({
            name: name,
            role: meta.role || 'member',
            title: meta.title || '社团成员',
            pass: meta.pass || '',
            joined: dateText(o.created)
          });
        }
      } else if (o.kind === '密码') {
        var m2 = findByName(list, name);
        var h = String(o.body || '').trim().split(/\s+/)[0];
        if (m2 && /^[0-9a-f]{64}$/i.test(h)) m2.pass = h.toLowerCase();
      } else if (o.kind === '移除') {
        var drop = findByName(list, name);
        if (drop && drop.role === 'admin') {
          var admins = list.filter(function (x) { return x.role === 'admin'; }).length;
          if (admins <= 1) return;
        }
        list = list.filter(function (x) {
          return String(x.name || '').trim().toLowerCase() !== String(name).trim().toLowerCase();
        });
      }
    });
    /* 本机改过的密码优先 */
    var local = readLocalPw();
    list.forEach(function (m) {
      var k = String(m.name || '').toLowerCase();
      if (local[k]) m.pass = local[k];
    });
    return list;
  }

  function mergeAnns(ops) {
    var out = [];
    (ops || []).forEach(function (o) {
      if (o.kind !== '公告') return;
      out.push({
        title: o.title,
        body: String(o.body || '').replace(/\r/g, '').trim(),
        time: timeText(o.created),
        number: o.number,
        url: o.url,
        open: o.state === 'open'
      });
    });
    out.sort(function (a, b) { return a.number < b.number ? 1 : -1; });
    return out;
  }

  /* ---------------- 写操作：开 GitHub 预填 issue ---------------- */

  function copyText(str) {
    var ta = document.createElement('textarea');
    ta.value = str;
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  }

  function toast(text, copyBody, url) {
    var old = document.getElementById('jmsu-toast');
    if (old) old.remove();
    var t = el('div', 'jmsu-toast');
    t.id = 'jmsu-toast';
    var span = el('span', '', esc(text));
    t.appendChild(span);
    if (copyBody !== undefined && copyBody !== null) {
      var c = el('button', 'jmsu-toast-btn', '复制内容');
      c.onclick = function () { copyText(copyBody); c.textContent = '已复制'; };
      t.appendChild(c);
    }
    if (url) {
      var o = el('a', 'jmsu-toast-btn', '打开发布页');
      o.href = url;
      o.target = '_blank';
      o.rel = 'noopener';
      t.appendChild(o);
    }
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 8000);
  }

  function issueUrl(title, body) {
    return ISSUE_NEW + '?title=' + encodeURIComponent(title) +
           (body ? '&body=' + encodeURIComponent(body) : '');
  }

  function openIssue(title, body) {
    var url = issueUrl(title, body);
    var w = null;
    try { w = window.open(url, '_blank'); } catch (e) { w = null; }
    var full = title + (body ? '\n' + body : '');
    if (w) {
      toast('发布页已打开。要你先登录 GitHub 的话，登录完会自动回到这一页。', full, null);
    } else {
      toast('新窗口被拦了。点「打开发布页」或「复制内容」去 GitHub 手动发。', full, url);
    }
    return url;
  }

  /* ---------------- 样式 ---------------- */

  var css = [
    ':root{--jm:#2f5d50;--jm-d:#26483d;--jm-l:#f3f7f5;--jm-b:#e4ebe7;--jm-t:#22303c;--jm-s:#8a9490}',
    '.jmsu-card{border:1px solid var(--jm-b);background:#fff;padding:14px 15px;margin:0 0 16px;font-size:13.5px;line-height:1.65}',
    '.jmsu-card .t{font-weight:600;letter-spacing:.06em;margin-bottom:10px;color:var(--jm-t);font-size:13px}',
    '.jmsu-card .s{color:var(--jm-s);font-size:12.5px;margin-bottom:10px;display:flex;align-items:center;gap:6px}',
    '.jmsu-card .who{color:var(--jm-t);font-weight:600;font-size:13.5px}',
    '.jmsu-badge{display:inline-block;padding:0 5px;font-size:11px;line-height:16px;letter-spacing:.04em;border:1px solid var(--jm-b);color:var(--jm);background:var(--jm-l)}',
    '.jmsu-badge.admin{border-color:#dcc98d;color:#8a6d0b;background:#fdf8e8}',
    '.jmsu-btn{display:block;width:100%;box-sizing:border-box;padding:8px 10px;background:var(--jm);color:#fff;border:0;cursor:pointer;font-size:13px;letter-spacing:.04em;font-family:inherit;transition:background .15s}',
    '.jmsu-btn:hover{background:var(--jm-d)}',
    '.jmsu-btn.ghost{background:#fff;color:var(--jm);border:1px solid var(--jm-b)}',
    '.jmsu-btn.ghost:hover{background:var(--jm-l)}',
    '.jmsu-btn.mini{width:auto;display:inline-block;padding:3px 10px;font-size:12px}',
    '.jmsu-btn.warn{background:#fff;color:#b03a2e;border:1px solid #ecd6d1}',
    '.jmsu-btn.warn:hover{background:#fdf3f1}',
    '.jmsu-btn+.jmsu-btn{margin-top:8px}',
    '.jmsu-row{display:flex;gap:8px}.jmsu-row>*{flex:1;min-width:0}',
    '.jmsu-field{margin-bottom:10px}',
    '.jmsu-field label{display:block;font-size:12px;color:var(--jm-s);margin-bottom:4px}',
    '.jmsu-field input,.jmsu-field textarea,.jmsu-field select{width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid #d8ded9;font-size:13.5px;font-family:inherit;background:#fff;color:var(--jm-t);outline:none;transition:border-color .15s}',
    '.jmsu-field input:focus,.jmsu-field textarea:focus,.jmsu-field select:focus{border-color:var(--jm)}',
    '.jmsu-field textarea{min-height:96px;resize:vertical;line-height:1.7}',
    '.jmsu-msg{font-size:12.5px;margin-top:6px;min-height:17px;line-height:1.6;word-break:break-all}',
    '.jmsu-msg.ok{color:#2f7d5c}.jmsu-msg.err{color:#b03a2e}',
    '.jmsu-mask{position:fixed;inset:0;background:rgba(24,30,28,.5);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px}',
    '.jmsu-modal{background:#fff;width:352px;max-width:100%;max-height:88vh;overflow:auto;padding:24px 24px 20px;box-shadow:0 12px 44px rgba(0,0,0,.22);box-sizing:border-box;-webkit-overflow-scrolling:touch}',
    '.jmsu-modal.wide{width:560px}',
    '.jmsu-modal h3{margin:0 0 2px;font-size:17px;letter-spacing:.05em;color:var(--jm-t)}',
    '.jmsu-modal .sub{color:var(--jm-s);font-size:12px;margin-bottom:18px}',
    '.jmsu-x{position:absolute;top:0;right:0;padding:12px 16px;cursor:pointer;color:#b9c2be;font-size:20px;line-height:1}',
    '.jmsu-x:hover{color:var(--jm-t)}',
    '.jmsu-modal{position:relative}',
    '.jmsu-tabs{display:flex;border-bottom:1px solid var(--jm-b);margin:0 0 18px}',
    '.jmsu-tab{padding:9px 16px;cursor:pointer;font-size:13px;color:var(--jm-s);border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .15s}',
    '.jmsu-tab.on{color:var(--jm-t);border-bottom-color:var(--jm);font-weight:600}',
    '.jmsu-sec{margin:20px 0 10px;font-size:11.5px;letter-spacing:.12em;color:var(--jm-s)}',
    '.jmsu-me{display:flex;align-items:center;gap:12px;margin:2px 0 16px}',
    '.jmsu-av{width:44px;height:44px;background:var(--jm);color:#fff;display:flex;align-items:center;justify-content:center;font-size:19px;flex:0 0 auto}',
    '.jmsu-me .nm{font-size:16px;font-weight:600;color:var(--jm-t);line-height:1.4}',
    '.jmsu-me .rl{font-size:12px;color:var(--jm-s);margin-top:2px}',
    '.jmsu-kv{display:flex;font-size:13px;padding:8px 0;border-bottom:1px solid #f1f4f2}',
    '.jmsu-kv .k{width:74px;color:var(--jm-s);flex:0 0 auto}',
    '.jmsu-kv .v{color:var(--jm-t);word-break:break-all}',
    '.jmsu-list{border-top:1px solid var(--jm-b)}',
    '.jmsu-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f1f4f2;font-size:13px}',
    '.jmsu-item .grow{flex:1;min-width:0}',
    '.jmsu-item .nm{font-weight:600;color:var(--jm-t);margin-right:6px}',
    '.jmsu-item .mt{color:var(--jm-s);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}',
    '.jmsu-empty{color:#a8b1ad;font-size:13px;padding:16px 0}',
    '.jmsu-hint{font-size:12px;color:var(--jm-s);line-height:1.75;margin-top:8px}',
    '.jmsu-ann{border-left:3px solid var(--jm);background:#fbfbf9;padding:13px 16px;margin:0 0 16px}',
    '.jmsu-ann h4{margin:0 0 5px;font-size:15px;letter-spacing:.02em}',
    '.jmsu-ann .meta{color:#a3aaa7;font-size:12px;margin-bottom:8px}',
    '.jmsu-ann .body{font-size:14px;line-height:1.9;white-space:pre-wrap;color:#333}',
    '.jmsu-ann.off{opacity:.5}',
    '.jmsu-fab{position:fixed;right:22px;bottom:26px;width:46px;height:46px;border-radius:50%;background:var(--jm);color:#fff;border:0;cursor:pointer;font-size:13px;letter-spacing:.08em;box-shadow:0 6px 20px rgba(47,93,80,.38);z-index:9990;display:flex;align-items:center;justify-content:center;font-family:inherit;transition:transform .15s,background .15s}',
    '.jmsu-fab:hover{background:var(--jm-d);transform:translateY(-1px)}',
    '.jmsu-fab .dot{position:absolute;top:9px;right:9px;width:6px;height:6px;border-radius:50%;background:#e8b64c}',
    '.jmsu-toast{position:fixed;right:22px;bottom:86px;z-index:9995;max-width:min(360px,86vw);background:#22303c;color:#fff;padding:12px 14px;font-size:12.5px;line-height:1.6;box-shadow:0 8px 26px rgba(0,0,0,.25);display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
    '.jmsu-toast span{flex:1 1 100%}',
    '.jmsu-toast-btn{background:rgba(255,255,255,.14);color:#fff;border:0;padding:5px 10px;font-size:12px;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-block}',
    '.jmsu-toast-btn:hover{background:rgba(255,255,255,.26)}',
    '@media (max-width:767px){.jmsu-fab{right:16px;bottom:18px;width:44px;height:44px}.jmsu-modal{padding:20px 18px 16px}.jmsu-field input,.jmsu-field textarea,.jmsu-field select{font-size:16px}.jmsu-modal.wide{width:100%}}'
  ].join('');

  function injectStyle() {
    if (document.getElementById('jmsu-style')) return;
    var s = el('style');
    s.id = 'jmsu-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------------- 登录 ---------------- */

  function matchMember(list, name, pass) {
    var h = sha256(pass);
    var want = String(name || '').trim().toLowerCase();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].name || '').trim().toLowerCase() === want && String(list[i].pass || '').toLowerCase() === h) {
        return list[i];
      }
    }
    return null;
  }

  function openLogin() {
    var mask = el('div', 'jmsu-mask');
    mask.innerHTML =
      '<div class="jmsu-modal">'
      + '<span class="jmsu-x">×</span>'
      + '<h3>登录</h3><div class="sub">DMT 社团</div>'
      + '<div class="jmsu-field"><label>姓名</label><input id="jmsu-u" type="text" autocomplete="username"></div>'
      + '<div class="jmsu-field"><label>密码</label><input id="jmsu-p" type="password" autocomplete="current-password"></div>'
      + '<button class="jmsu-btn" id="jmsu-do">登录</button>'
      + '<div class="jmsu-msg" id="jmsu-m"></div>'
      + '</div>';
    document.body.appendChild(mask);

    var msg = mask.querySelector('#jmsu-m');
    var btn = mask.querySelector('#jmsu-do');
    mask.querySelector('.jmsu-x').onclick = function () { mask.remove(); };
    mask.addEventListener('click', function (e) { if (e.target === mask) mask.remove(); });

    var go = function () {
      var u = mask.querySelector('#jmsu-u').value.trim();
      var p = mask.querySelector('#jmsu-p').value;
      if (!u || !p) { setMsg(msg, 'err', '姓名和密码都要填'); return; }
      btn.disabled = true;
      setMsg(msg, '', '登录中…');
      loadData(false).then(function (d) {
        var m = matchMember(d.members, u, p);
        if (!m) { setMsg(msg, 'err', '姓名或密码不正确'); return; }
        writeSession(m);
        mask.remove();
        refreshEntry();
        renderHomeAnns();
        if (m.role === 'admin') openAdminPanel(readSession());
      }).catch(function () {
        setMsg(msg, 'err', '网络异常，稍后再试');
      }).then(function () { btn.disabled = false; });
    };

    btn.onclick = go;
    mask.querySelector('#jmsu-p').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    mask.querySelector('#jmsu-u').focus();
  }

  function setMsg(node, cls, text) {
    node.className = 'jmsu-msg' + (cls ? ' ' + cls : '');
    node.textContent = text || '';
  }

  /* ---------------- 侧边栏卡片 + 悬浮入口 ---------------- */

  var cardBox = null;

  function cardBody(box) {
    box.innerHTML = '';
    var s = readSession();
    if (!s) {
      var b = el('button', 'jmsu-btn', '登录');
      b.onclick = openLogin;
      box.appendChild(b);
      return;
    }
    var isAdmin = s.role === 'admin';
    var line = el('div', 's');
    line.innerHTML = '<span class="who">' + esc(s.name) + '</span>'
      + '<span class="jmsu-badge' + (isAdmin ? ' admin' : '') + '">' + (isAdmin ? '管理员' : '成员') + '</span>';
    box.appendChild(line);

    var b1 = el('button', 'jmsu-btn', isAdmin ? '管理面板' : '个人中心');
    b1.onclick = function () { isAdmin ? openAdminPanel(s) : openProfile(s); };
    box.appendChild(b1);

    if (isAdmin) {
      var b2 = el('button', 'jmsu-btn ghost', '个人中心');
      b2.onclick = function () { openProfile(s); };
      box.appendChild(b2);
    }

    var out = el('button', 'jmsu-btn ghost', '退出登录');
    out.onclick = function () {
      clearSession();
      refreshEntry();
      renderHomeAnns();
    };
    box.appendChild(out);
  }

  function buildSidebar() {
    var host = document.querySelector('.sidebar-inner');
    if (!host) return;
    var old = document.getElementById('jmsu-card');
    if (old) old.remove();
    var card = el('div', 'jmsu-card');
    card.id = 'jmsu-card';
    card.appendChild(el('div', 't', '社团入口'));
    var body = el('div');
    card.appendChild(body);
    host.insertBefore(card, host.firstChild);
    cardBox = body;
    cardBody(body);
  }

  function buildFab() {
    if (document.getElementById('jmsu-fab')) return;
    var b = el('button', 'jmsu-fab');
    b.id = 'jmsu-fab';
    b.type = 'button';
    b.textContent = '社团';
    b.onclick = function () {
      var s = readSession();
      if (!s) openLogin();
      else if (s.role === 'admin') openAdminPanel(s);
      else openProfile(s);
    };
    document.body.appendChild(b);
  }

  function refreshEntry() {
    if (cardBox) cardBody(cardBox);
    buildFab();
  }

  /* ---------------- 个人中心 ---------------- */

  function openProfile(s) {
    if (!s) return;
    var localHash = readLocalPw()[String(s.name).toLowerCase()];
    var mask = el('div', 'jmsu-mask');
    mask.innerHTML =
      '<div class="jmsu-modal">'
      + '<span class="jmsu-x">×</span>'
      + '<h3>个人中心</h3><div class="sub">' + esc(s.title || '社团成员') + '</div>'
      + '<div class="jmsu-me"><div class="jmsu-av">' + esc(String(s.name).slice(0, 1)) + '</div>'
      + '<div><div class="nm">' + esc(s.name) + '</div>'
      + '<div class="rl">' + (s.role === 'admin' ? '管理员' : '成员') + '</div></div></div>'
      + '<div class="jmsu-kv"><div class="k">加入时间</div><div class="v" id="jmsu-joined">—</div></div>'
      + '<div class="jmsu-sec">修改密码</div>'
      + '<div class="jmsu-field"><label>当前密码</label><input id="jmsu-p0" type="password" autocomplete="current-password"></div>'
      + '<div class="jmsu-row">'
      + '<div class="jmsu-field"><label>新密码</label><input id="jmsu-p1" type="password" autocomplete="new-password"></div>'
      + '<div class="jmsu-field"><label>再输一次</label><input id="jmsu-p2" type="password" autocomplete="new-password"></div>'
      + '</div>'
      + '<button class="jmsu-btn" id="jmsu-pw-save">保存</button>'
      + '<div class="jmsu-msg" id="jmsu-pw-msg"></div>'
      + (localHash ? '<div class="jmsu-hint">这台设备上已改过密码，换设备时用申请码恢复。</div>' : '')
      + '</div>';
    document.body.appendChild(mask);

    var msg = mask.querySelector('#jmsu-pw-msg');
    mask.querySelector('.jmsu-x').onclick = function () { mask.remove(); };
    mask.addEventListener('click', function (e) { if (e.target === mask) mask.remove(); });

    loadData(false).then(function (d) {
      var me = findByName(d.members, s.name);
      if (me && me.joined) mask.querySelector('#jmsu-joined').textContent = me.joined;
    });

    mask.querySelector('#jmsu-pw-save').onclick = function () {
      var p0 = mask.querySelector('#jmsu-p0').value;
      var p1 = mask.querySelector('#jmsu-p1').value;
      var p2 = mask.querySelector('#jmsu-p2').value;
      if (!p0 || !p1 || !p2) { setMsg(msg, 'err', '三个框都要填'); return; }
      if (p1 !== p2) { setMsg(msg, 'err', '两次输入不一样'); return; }
      if (p1.length < 6) { setMsg(msg, 'err', '至少 6 位'); return; }
      if (p1 === p0) { setMsg(msg, 'err', '新密码跟旧的一样'); return; }
      if (p1.toLowerCase().indexOf(String(s.name).toLowerCase()) >= 0) { setMsg(msg, 'err', '密码里不要带自己的姓名'); return; }

      loadData(false).then(function (d) {
        var me = findByName(d.members, s.name);
        if (!me) { setMsg(msg, 'err', '成员表里找不到你'); return; }
        if (String(me.pass || '').toLowerCase() !== sha256(p0)) { setMsg(msg, 'err', '当前密码不对'); return; }

        var h = sha256(p1);
        writeLocalPw(s.name, h);
        mask.querySelector('#jmsu-p0').value = '';
        mask.querySelector('#jmsu-p1').value = '';
        mask.querySelector('#jmsu-p2').value = '';

        if (s.role === 'admin') {
          openIssue('[密码] ' + s.name, h);
          setMsg(msg, 'ok', '已在本机生效；发布页点提交后全站生效');
        } else {
          setMsg(msg, 'ok', '已在本机生效。全站同步：把下面这行发给社长');
          var box = el('div', 'jmsu-field');
          box.innerHTML = '<input id="jmsu-req" type="text" readonly value="' + esc('[密码] ' + s.name + ' ' + h) + '">';
          msg.parentNode.insertBefore(box, msg.nextSibling);
          var inp = box.querySelector('#jmsu-req');
          inp.onclick = function () { inp.select(); };
        }
      });
    };
  }

  /* ---------------- 管理面板 ---------------- */

  function openAdminPanel(s) {
    if (!s) return;
    var mask = el('div', 'jmsu-mask');
    mask.innerHTML =
      '<div class="jmsu-modal wide">'
      + '<span class="jmsu-x">×</span>'
      + '<h3>管理面板</h3><div class="sub">' + esc(s.name) + ' · ' + esc(s.title || '管理员') + '</div>'
      + '<div class="jmsu-tabs"><div class="jmsu-tab on" data-tab="ann">公告</div>'
      + '<div class="jmsu-tab" data-tab="mem">成员</div></div>'
      + '<div id="jmsu-pane-ann"></div>'
      + '<div id="jmsu-pane-mem" style="display:none"></div>'
      + '<button class="jmsu-btn ghost" id="jmsu-out" style="margin-top:20px">退出登录</button>'
      + '</div>';
    document.body.appendChild(mask);
    mask.querySelector('.jmsu-x').onclick = function () { mask.remove(); };
    mask.addEventListener('click', function (e) { if (e.target === mask) mask.remove(); });
    mask.querySelector('#jmsu-out').onclick = function () {
      clearSession(); mask.remove(); refreshEntry(); renderHomeAnns();
    };

    var tabs = mask.querySelectorAll('.jmsu-tab');
    var panes = {
      ann: mask.querySelector('#jmsu-pane-ann'),
      mem: mask.querySelector('#jmsu-pane-mem')
    };
    function show(name) {
      Array.prototype.forEach.call(tabs, function (t) {
        t.className = 'jmsu-tab' + (t.getAttribute('data-tab') === name ? ' on' : '');
      });
      Object.keys(panes).forEach(function (k) { panes[k].style.display = k === name ? '' : 'none'; });
      if (name === 'mem') renderMemberPane(panes.mem, s);
    }
    Array.prototype.forEach.call(tabs, function (t) {
      t.onclick = function () { show(t.getAttribute('data-tab')); };
    });

    renderAnnPane(panes.ann);
  }

  /* --- 公告 --- */

  function renderAnnPane(pane) {
    pane.innerHTML =
      '<div class="jmsu-field"><label>标题</label><input id="jmsu-t" type="text" maxlength="40" placeholder="例如：周五例会改到 302"></div>'
      + '<div class="jmsu-field"><label>内容</label><textarea id="jmsu-c" placeholder="时间、地点、要带什么"></textarea></div>'
      + '<button class="jmsu-btn" id="jmsu-send">发布</button>'
      + '<div class="jmsu-msg" id="jmsu-m2"></div>'
      + '<div class="jmsu-sec">已有公告</div>'
      + '<div id="jmsu-ann-list" class="jmsu-list"><div class="jmsu-empty">读取中…</div></div>';

    var msg = pane.querySelector('#jmsu-m2');
    var listBox = pane.querySelector('#jmsu-ann-list');

    pane.querySelector('#jmsu-send').onclick = function () {
      var t = pane.querySelector('#jmsu-t').value.trim();
      var c = pane.querySelector('#jmsu-c').value.trim();
      if (!t || !c) { setMsg(msg, 'err', '标题和内容都要填'); return; }
      openIssue('[公告] ' + t, c);
      setMsg(msg, 'ok', '发布页已打开，点 Submit 即可');
      pane.querySelector('#jmsu-t').value = '';
      pane.querySelector('#jmsu-c').value = '';
    };

    loadData(true).then(function (d) {
      listBox.innerHTML = '';
      if (!d.anns.length) { listBox.appendChild(el('div', 'jmsu-empty', '还没有公告')); return; }
      d.anns.forEach(function (a) {
        var row = el('div', 'jmsu-item');
        row.innerHTML = '<div class="grow"><div class="nm">' + esc(a.title) + '</div>'
          + '<div class="mt">' + esc(a.time) + (a.open ? '' : ' · 已关闭') + '</div></div>';
        if (a.open) {
          var close = el('button', 'jmsu-btn mini warn', '关闭');
          close.onclick = function () {
            window.open(a.url, '_blank');
            setMsg(msg, '', '在打开的页面点 Close issue 即可下架');
          };
          row.appendChild(close);
        }
        listBox.appendChild(row);
      });
    });
  }

  /* --- 成员 --- */

  function renderMemberPane(pane, s) {
    pane.innerHTML =
      '<div class="jmsu-sec" style="margin-top:0">新增成员</div>'
      + '<div class="jmsu-row">'
      + '<div class="jmsu-field"><label>姓名</label><input id="jmsu-nm" type="text"></div>'
      + '<div class="jmsu-field"><label>身份</label><input id="jmsu-ti" type="text" placeholder="2024级成员"></div>'
      + '</div>'
      + '<div class="jmsu-row">'
      + '<div class="jmsu-field"><label>初始密码</label><input id="jmsu-pw" type="text" placeholder="至少 6 位"></div>'
      + '<div class="jmsu-field"><label>角色</label><select id="jmsu-rl"><option value="member">成员</option><option value="admin">管理员</option></select></div>'
      + '</div>'
      + '<button class="jmsu-btn" id="jmsu-add">添加</button>'
      + '<div class="jmsu-msg" id="jmsu-m3"></div>'
      + '<div class="jmsu-sec">成员</div>'
      + '<div id="jmsu-mem-list" class="jmsu-list"><div class="jmsu-empty">读取中…</div></div>'
      + '<div class="jmsu-sec">成员改密申请</div>'
      + '<div class="jmsu-field"><input id="jmsu-req-in" type="text" placeholder="[密码] 姓名 哈希"></div>'
      + '<button class="jmsu-btn ghost" id="jmsu-req-do">同步</button>'
      + '<div class="jmsu-msg" id="jmsu-m5"></div>';

    var msg = pane.querySelector('#jmsu-m3');

    function reload() {
      loadData(true).then(function (d) {
        var box = pane.querySelector('#jmsu-mem-list');
        box.innerHTML = '';
        if (!d.members.length) { box.appendChild(el('div', 'jmsu-empty', '还没有成员')); return; }
        d.members.forEach(function (m) {
          var isSelf = String(m.name || '').toLowerCase() === String(s.name || '').toLowerCase();
          var row = el('div', 'jmsu-item');
          row.innerHTML = '<div class="grow"><span class="nm">' + esc(m.name) + '</span>'
            + '<span class="jmsu-badge' + (m.role === 'admin' ? ' admin' : '') + '">'
            + (m.role === 'admin' ? '管理员' : '成员') + '</span>'
            + '<div class="mt">' + esc(m.title || '') + '</div></div>';
          if (isSelf) {
            var me = el('button', 'jmsu-btn mini ghost', '个人中心');
            me.onclick = function () { mask.remove(); openProfile(s); };
            row.appendChild(me);
          } else {
            var del = el('button', 'jmsu-btn mini warn', '移除');
            del.onclick = function () {
              if (!window.confirm('移除「' + m.name + '」？')) return;
              openIssue('[移除] ' + m.name, '');
              setMsg(msg, 'ok', '移除页已打开，点 Submit 生效');
            };
            row.appendChild(del);
          }
          box.appendChild(row);
        });
      });
    }

    pane.querySelector('#jmsu-add').onclick = function () {
      var nm = pane.querySelector('#jmsu-nm').value.trim();
      var ti = pane.querySelector('#jmsu-ti').value.trim();
      var pw = pane.querySelector('#jmsu-pw').value;
      var rl = pane.querySelector('#jmsu-rl').value;
      if (!nm || !pw) { setMsg(msg, 'err', '姓名和初始密码都要填'); return; }
      if (pw.length < 6) { setMsg(msg, 'err', '密码至少 6 位'); return; }
      openIssue('[成员] ' + nm, '身份: ' + (ti || (rl === 'admin' ? '管理员' : '社团成员')) +
        '\n角色: ' + rl + '\n密码: ' + sha256(pw));
      setMsg(msg, 'ok', '添加页已打开，点 Submit 生效');
      pane.querySelector('#jmsu-nm').value = '';
      pane.querySelector('#jmsu-ti').value = '';
      pane.querySelector('#jmsu-pw').value = '';
    };

    pane.querySelector('#jmsu-req-do').onclick = function () {
      var raw = pane.querySelector('#jmsu-req-in').value.trim();
      var m = raw.match(/^\[密码\]\s*(\S+)\s+([0-9a-f]{64})$/i);
      if (!m) { setMsg(pane.querySelector('#jmsu-m5'), 'err', '格式不对'); return; }
      openIssue('[密码] ' + m[1], m[2].toLowerCase());
      setMsg(pane.querySelector('#jmsu-m5'), 'ok', '已打开同步页，点 Submit 生效');
      pane.querySelector('#jmsu-req-in').value = '';
    };

    reload();
  }

  /* ---------------- 首页公告 ---------------- */

  function renderHomeAnns() {
    var host = document.querySelector('.main-inner.index') || document.querySelector('#posts');
    if (!host) return;
    var old = document.getElementById('jmsu-anns');
    if (old) old.remove();

    loadData(false).then(function (d) {
      var list = d.anns.filter(function (a) { return a.open; }).slice(0, 5);
      if (!list.length) return;
      var wrap = el('div');
      wrap.id = 'jmsu-anns';
      wrap.style.marginBottom = '8px';
      list.forEach(function (a) {
        var box = el('div', 'jmsu-ann');
        box.appendChild(el('h4', '', esc(a.title)));
        box.appendChild(el('div', 'meta', esc(a.time)));
        box.appendChild(el('div', 'body', esc(a.body)));
        wrap.appendChild(box);
      });
      var anchor = host.querySelector('.post-block');
      if (anchor) host.insertBefore(wrap, anchor); else host.insertBefore(wrap, host.firstChild);
    });
  }

  /* ---------------- 启动 ---------------- */

  function init() {
    injectStyle();
    var tries = 0;
    var timer = setInterval(function () {
      if (document.querySelector('.sidebar-inner')) {
        clearInterval(timer);
        buildSidebar();
        buildFab();
        renderHomeAnns();
      } else if (++tries > 40) {
        clearInterval(timer);
        buildFab();
        renderHomeAnns();
      }
    }, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
