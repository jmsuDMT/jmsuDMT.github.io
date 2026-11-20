/* DMT 社团 · 侧边栏登录与公告管理
 * 纯前端实现：账号校验在浏览器里，公告数据存仓库的 source/data/announcements.json
 */
(function () {
  'use strict';

  var REPO = 'jmsuDMT/jmsuDMT.github.io';
  var BRANCH = 'main';
  var DATA_PATH = 'data/announcements.json';
  var ACCOUNTS = { '李锐': '123456' };
  var KEY = 'jmsu_admin_user';
  var TKEY = 'jmsu_admin_token';

  function token() { return localStorage.getItem(TKEY) || ''; }
  function setToken(t) { localStorage.setItem(TKEY, t); }
  function user() { return localStorage.getItem(KEY) || ''; }
  function setUser(u) { u ? localStorage.setItem(KEY, u) : localStorage.removeItem(KEY); }

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html !== undefined) d.innerHTML = html;
    return d;
  }

  var css = ''
    + '.jmsu-card{border:1px solid #e6e6e6;background:#fafafa;padding:14px 16px;margin:0 0 18px;font-size:14px;line-height:1.7}'
    + '.jmsu-card .t{font-weight:600;letter-spacing:.08em;margin-bottom:8px;color:#22303c}'
    + '.jmsu-card .s{color:#8a8a8a;font-size:12px;margin-bottom:10px}'
    + '.jmsu-btn{display:block;width:100%;box-sizing:border-box;padding:7px 10px;background:#2f5d50;color:#fff;border:0;cursor:pointer;font-size:13px;letter-spacing:.05em}'
    + '.jmsu-btn:hover{background:#264a40}'
    + '.jmsu-btn.ghost{background:#fff;color:#2f5d50;border:1px solid #cdd8d3}'
    + '.jmsu-btn.ghost:hover{background:#f2f6f4}'
    + '.jmsu-field{margin-bottom:9px}'
    + '.jmsu-field label{display:block;font-size:12px;color:#6b6b6b;margin-bottom:3px}'
    + '.jmsu-field input,.jmsu-field textarea{width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #d9d9d9;font-size:13px;font-family:inherit;background:#fff}'
    + '.jmsu-field textarea{min-height:90px;resize:vertical}'
    + '.jmsu-msg{font-size:12px;margin-top:8px;min-height:16px}'
    + '.jmsu-msg.ok{color:#2f7d5c}.jmsu-msg.err{color:#b03a2e}'
    + '.jmsu-modal-mask{position:fixed;inset:0;background:rgba(20,24,28,.55);z-index:9998;display:flex;align-items:center;justify-content:center}'
    + '.jmsu-modal{background:#fff;width:340px;max-width:92vw;padding:22px 24px;box-shadow:0 10px 40px rgba(0,0,0,.2)}'
    + '.jmsu-modal h3{margin:0 0 4px;font-size:17px;letter-spacing:.04em}'
    + '.jmsu-modal .sub{color:#8a8a8a;font-size:12px;margin-bottom:16px}'
    + '.jmsu-ann{border-left:3px solid #2f5d50;background:#fbfbf9;padding:12px 16px;margin:0 0 16px}'
    + '.jmsu-ann h4{margin:0 0 6px;font-size:15px}'
    + '.jmsu-ann .meta{color:#9a9a9a;font-size:12px;margin-bottom:8px}'
    + '.jmsu-ann .body{font-size:14px;line-height:1.9;white-space:pre-wrap;color:#333}'
    + '.jmsu-close{float:right;cursor:pointer;color:#999;font-size:18px;line-height:1}';

  function injectStyle() {
    var s = el('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function apiGet(path) {
    return fetch('https://api.github.com/repos/' + REPO + '/contents/' + path + '?ref=' + BRANCH, {
      headers: { 'Authorization': 'token ' + token(), 'Accept': 'application/vnd.github+json' }
    }).then(function (r) { return r.ok ? r.json() : null; });
  }

  function apiPut(path, content, sha, message) {
    var body = {
      message: message,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: BRANCH
    };
    if (sha) body.sha = sha;
    return fetch('https://api.github.com/repos/' + REPO + '/contents/' + path, {
      method: 'PUT',
      headers: {
        'Authorization': 'token ' + token(),
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }).then(function (r) { return r.ok; });
  }

  function decodeContent(obj) {
    try {
      return decodeURIComponent(escape(atob((obj.content || '').replace(/\n/g, ''))));
    } catch (e) { return ''; }
  }

  /* ---------- 侧边栏卡片 ---------- */

  function cardBody(box) {
    box.innerHTML = '';
    var u = user();
    if (!u) {
      box.appendChild(el('div', 's', '登录后可发布公告'));
      var b = el('button', 'jmsu-btn', '管理员登录');
      b.onclick = openLogin;
      box.appendChild(b);
    } else {
      box.appendChild(el('div', 's', '当前 · ' + u));
      var b1 = el('button', 'jmsu-btn', '发布公告');
      b1.onclick = openPublish;
      var b2 = el('button', 'jmsu-btn ghost', '退出登录');
      b2.style.marginTop = '8px';
      b2.onclick = function () { setUser(''); cardBody(box); renderAnnouncements(); };
      box.appendChild(b1);
      box.appendChild(b2);
    }
  }

  function buildSidebar() {
    var host = document.querySelector('.sidebar-inner');
    if (!host) return;
    var card = el('div', 'jmsu-card');
    card.appendChild(el('div', 't', '社团管理'));
    var body = el('div');
    card.appendChild(body);
    host.insertBefore(card, host.firstChild);
    cardBody(body);
    card._body = body;
  }

  /* ---------- 登录 ---------- */

  function openLogin() {
    var mask = el('div', 'jmsu-modal-mask');
    mask.innerHTML = '<div class="jmsu-modal"><span class="jmsu-close">×</span>'
      + '<h3>管理员登录</h3><div class="sub">仅限社团负责人使用</div>'
      + '<div class="jmsu-field"><label>姓名</label><input id="jmsu-u" type="text" autocomplete="off"></div>'
      + '<div class="jmsu-field"><label>密码</label><input id="jmsu-p" type="password"></div>'
      + '<button class="jmsu-btn" id="jmsu-do">登录</button>'
      + '<div class="jmsu-msg" id="jmsu-m"></div></div>';
    document.body.appendChild(mask);
    mask.querySelector('.jmsu-close').onclick = function () { mask.remove(); };
    mask.addEventListener('click', function (e) { if (e.target === mask) mask.remove(); });

    var go = function () {
      var u = mask.querySelector('#jmsu-u').value.trim();
      var p = mask.querySelector('#jmsu-p').value;
      var m = mask.querySelector('#jmsu-m');
      if (ACCOUNTS[u] && ACCOUNTS[u] === p) {
        setUser(u);
        m.className = 'jmsu-msg ok';
        m.textContent = '登录成功';
        setTimeout(function () {
          mask.remove();
          var b = document.querySelector('.jmsu-card') && document.querySelector('.jmsu-card')._body;
          if (b) cardBody(b);
        }, 500);
      } else {
        m.className = 'jmsu-msg err';
        m.textContent = '姓名或密码不正确';
      }
    };
    mask.querySelector('#jmsu-do').onclick = go;
    mask.querySelector('#jmsu-p').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    mask.querySelector('#jmsu-u').focus();
  }

  /* ---------- 发布公告 ---------- */

  function openPublish() {
    var mask = el('div', 'jmsu-modal-mask');
    mask.innerHTML = '<div class="jmsu-modal" style="width:460px"><span class="jmsu-close">×</span>'
      + '<h3>发布公告</h3><div class="sub">发布后约 1 分钟在首页显示</div>'
      + '<div class="jmsu-field"><label>标题</label><input id="jmsu-t" type="text" maxlength="40"></div>'
      + '<div class="jmsu-field"><label>内容</label><textarea id="jmsu-c"></textarea></div>'
      + '<button class="jmsu-btn" id="jmsu-send">发布</button>'
      + '<div class="jmsu-msg" id="jmsu-m2"></div></div>';
    document.body.appendChild(mask);
    mask.querySelector('.jmsu-close').onclick = function () { mask.remove(); };

    mask.querySelector('#jmsu-send').onclick = function () {
      var t = mask.querySelector('#jmsu-t').value.trim();
      var c = mask.querySelector('#jmsu-c').value.trim();
      var m = mask.querySelector('#jmsu-m2');
      if (!t || !c) { m.className = 'jmsu-msg err'; m.textContent = '标题和内容都要填'; return; }
      if (!token()) {
        var tk = prompt('首次发布需要 GitHub 访问令牌，只存在这台电脑的浏览器里：');
        if (!tk) { m.className='jmsu-msg err'; m.textContent='需要令牌才能发布'; return; }
        setToken(tk.trim());
      }
      m.className = 'jmsu-msg';
      m.textContent = '发布中…';

      apiGet(DATA_PATH).then(function (file) {
        var list = [];
        var sha = null;
        if (file ) {
          sha = file.sha;
          try { list = JSON.parse(decodeContent(file) || '[]'); } catch (e) { list = []; }
        }
        list.unshift({
          title: t,
          body: c,
          author: user(),
          time: new Date().toISOString().slice(0, 16).replace('T', ' ')
        });
        return apiPut(DATA_PATH, JSON.stringify(list, null, 2), sha, '公告：' + t);
      }).then(function (ok) {
        if (ok) {
          m.className = 'jmsu-msg ok';
          m.textContent = '已提交，约 1 分钟后生效';
          setTimeout(function () { mask.remove(); }, 1600);
        } else {
          m.className = 'jmsu-msg err';
          m.textContent = '提交失败，检查网络或权限';
        }
      }).catch(function () {
        m.className = 'jmsu-msg err';
        m.textContent = '请求异常';
      });
    };
    mask.querySelector('#jmsu-t').focus();
  }

  /* ---------- 首页公告区 ---------- */

  function renderAnnouncements() {
    var posts = document.querySelector('#posts');
    if (!posts) return;
    var old = document.getElementById('jmsu-anns');
    if (old) old.remove();

    fetch('/data/announcements.json?t=' + Date.now())
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (list) {
        if (!list || !list.length) return;
        var wrap = el('div');
        wrap.id = 'jmsu-anns';
        list.slice(0, 5).forEach(function (a) {
          var d = el('div', 'jmsu-ann');
          d.appendChild(el('h4', '', escapeHtml(a.title)));
          d.appendChild(el('div', 'meta', escapeHtml(a.time || '') + (a.author ? ' · ' + escapeHtml(a.author) : '')));
          d.appendChild(el('div', 'body', escapeHtml(a.body)));
          wrap.appendChild(d);
        });
        posts.parentNode.insertBefore(wrap, posts);
      }).catch(function () {});
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function init() {
    injectStyle();
    var tries = 0;
    var timer = setInterval(function () {
      if (document.querySelector('.sidebar-inner')) {
        clearInterval(timer);
        buildSidebar();
        renderAnnouncements();
      } else if (++tries > 40) {
        clearInterval(timer);
        renderAnnouncements();
      }
    }, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
