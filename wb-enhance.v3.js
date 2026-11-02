/* =====================================================================
 * teacher-workbench 首页优化增强层（wb-enhance.js）
 * 设计目标：在不改动原 1.1MB index.html 业务代码的前提下，叠加：
 *   1) 侧栏顶 Logo + 标题 + 副标题（沿用 app 已有的 wsName/wsSub/wsIcon）
 *   2) 「我的」页：去掉个人资料设置、工作台品牌→工作台设置、顶部"首页设置"分组 + 导航设置入口
 *   3) 导航设置：一级/二级导航改名、换图标（公共图标库）、拖拽排序、二级跨一级改父级
 *   4) 「工作」收起/展开 + 箭头切换；「我的」固定左下角（树状结构，无横线分隔）
 *   5) 公共图标库：系统默认 + 教师上传（支持动图），用于导航与工作图标
 * 持久化：沿用 app 的 localStorage 模式（每浏览器 = 当前教师）。
 * ===================================================================== */
(function () {
  'use strict';

  var Q = window.Q || function (s, r) { return (r || document).querySelector(s); };
  var $ = window.$ || function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var WB = {};
  window.WBEnh = WB;

  /* ---------------- 存储 ---------------- */
  var LS = {
    nav: 'wb_enh_nav_v1',     // 导航配置
    icons: 'wb_enh_icons_v1', // 公共图标库（教师上传）
    work: 'wb_enh_work_v1'    // 各一级导航收起状态
  };

  function load(k, def) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; }
    catch (e) { return def; }
  }
  function save(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('[WBEnh] 存储失败', k, e); }
  }

  /* ---------------- 默认数据 ---------------- */
  // 一级导航（data-view 必须与原有点击逻辑保持一致）
  var L1_DEFAULT = [
    { view: 'overview', label: '首页' },
    { view: '工作', label: '工作', group: true },
    { view: 'daily', label: '日常' },
    { view: '学习', label: '学习' },
    { view: '助手', label: '小课堂' },
    { view: 'trash', label: '回收站' }
  ];
  // 二级导航（key 与 app 内置 dr / data-side-sub 一致，保证点击仍能跳转）
  var L2_DEFAULT = [
    { k: 'classlog', n: '上课', parent: '工作' },
    { k: 'course', n: '课表', parent: '工作' },
    { k: 'prep', n: '备课', parent: '工作' },
    { k: 'repair', n: '维修', parent: '工作' },
    { k: 'attend', n: '考勤', parent: '工作' },
    { k: 'invig', n: '监考', parent: '工作' },
    { k: 'trip', n: '出差', parent: '工作' }
  ];

  // 默认图标（系统内置，SVG 字符串）
  var ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.4 12 3.2l9 7.2"/><path d="M5.6 9.4V20h12.8V9.4"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/></svg>',
    work: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.6" y="7" width="18.8" height="13.4" rx="2.2"/><path d="M8.4 7V5.2a2 2 0 0 1 2-2h3.2a2 2 0 0 1 2 2V7M2.6 12.4h18.8"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M3.5 9h17M8 3v3M16 3v3"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5h5.2A2.8 2.8 0 0 1 12 7.3v13a2.4 2.4 0 0 0-2.4-2.4H4z"/><path d="M20 4.5h-5.2A2.8 2.8 0 0 0 12 7.3v13a2.4 2.4 0 0 1 2.4-2.4H20z"/></svg>',
    grad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 9 12 4 2 9l10 5 10-5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/></svg>',
    class: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8M12 18v3"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9.6 7V5.2a1.5 1.5 0 0 1 1.5-1.5h1.8a1.5 1.5 0 0 1 1.5 1.5V7"/><path d="M6.4 7l.8 12.1A1.9 1.9 0 0 0 9.1 21h5.8a1.9 1.9 0 0 0 1.9-1.9L17.6 7"/><path d="M10.4 11v6M13.6 11v6"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-1.9a4.2 4.2 0 0 0-4.2-4.2H8.2A4.2 4.2 0 0 0 4 19.1V21"/><circle cx="12" cy="7.4" r="3.6"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.7-1.3-1.8-3.1-2 .8a7.5 7.5 0 0 0-2.6-1.5L14.3 3H9.7l-.4 2.4a7.5 7.5 0 0 0-2.6 1.5l-2-.8L2.9 9.2 4.6 10.5a7.6 7.6 0 0 0 0 3L2.9 14.8l1.8 3.1 2-.8a7.5 7.5 0 0 0 2.6 1.5l.4 2.4h4.6l.4-2.4a7.5 7.5 0 0 0 2.6-1.5l2 .8 1.8-3.1z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-9"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 16l-5-5L5 20"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-9.4A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.6C19 15.6 12 20 12 20z"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.8 3.8 0 0 1 18 18z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    msg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.8A8 8 0 1 1 21 12z"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14v11l-5 5H5z"/><path d="M14 20v-5h5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    tool: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4l5 5-7 7-5 1 1-5z"/><path d="M4 20l4-4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15 13 9V4a1.5 1.5 0 0 0-3 0v5L2 15l2 2 6-2v4l-2 1 3 2 3-2-2-1v-4l6 2z"/></svg>'
  };
  var ICON_KEYS = Object.keys(ICONS);

  /* ---------------- 状态 ---------------- */
  function defaults() {
    return {
      l1: {
        order: L1_DEFAULT.map(function (x) { return x.view; }),
        custom: {} // view -> {label, icon:{type,value}}
      },
      l2: L2_DEFAULT.map(function (x) { return { k: x.k, n: x.n, parent: x.parent, icon: null }; }),
      me: { label: '我的', icon: null }
    };
  }
  WB.nav = load(LS.nav, null) || defaults();
  // 合并保证字段完整
  (function () {
    var d = defaults();
    WB.nav.l1 = WB.nav.l1 || d.l1;
    WB.nav.l1.order = WB.nav.l1.order && WB.nav.l1.order.length ? WB.nav.l1.order : d.l1.order;
    WB.nav.l1.custom = WB.nav.l1.custom || {};
    WB.nav.l2 = WB.nav.l2 && WB.nav.l2.length ? WB.nav.l2 : d.l2;
    WB.nav.me = WB.nav.me || d.me;
  })();
  WB.icons = load(LS.icons, []); // [{id,name,value}]
  WB.collapsed = load(LS.work, {}); // view -> true/false

  // 记录每个一级导航原始图标 HTML，便于还原
  var origIcon = {};

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  // 安全更新 tab 显示文字：优先 .tw-lab；否则定位 svg 后的第一个文本节点更新，
  // 避免在末尾 appendChild 导致原站带 <i class="tab-dot"> 等尾随元素时重复文本（如「回收站回收站」）。
  function setTabLabel(btn, label) {
    if (!btn) return;
    var lab = btn.querySelector('.tw-lab');
    if (lab) { lab.textContent = label; return; }
    var svg = btn.querySelector('svg');
    var node = svg ? svg.nextSibling : btn.firstChild;
    while (node) {
      if (node.nodeType === 3) {
        if (node.textContent.trim() !== '') { node.textContent = label; return; }
        node = node.nextSibling; continue;
      }
      break;
    }
    var t = document.createTextNode(label);
    if (svg && svg.nextSibling) btn.insertBefore(t, svg.nextSibling);
    else btn.insertBefore(t, btn.firstChild);
  }

  function l1Label(view) {
    for (var i = 0; i < L1_DEFAULT.length; i++) if (L1_DEFAULT[i].view === view) return L1_DEFAULT[i].label;
    if (view === 'me') return '我的';
    return view;
  }
  function l1Meta(view) { for (var i = 0; i < L1_DEFAULT.length; i++) if (L1_DEFAULT[i].view === view) return L1_DEFAULT[i]; return null; }
  function l2ByKey(k) { for (var i = 0; i < WB.nav.l2.length; i++) if (WB.nav.l2[i].k === k) return WB.nav.l2[i]; return null; }
  function isGroup(view) {
    // 有二级导航的一级导航即为分组
    for (var i = 0; i < WB.nav.l2.length; i++) if (WB.nav.l2[i].parent === view) return true;
    return false;
  }
  function getCollapsed(view) {
    // 树状结构：默认展开，只有显式设为 true 才收起（保证一进来看得到二级导航）
    return WB.collapsed[view] === true;
  }
  function setCollapsed(view, v) { WB.collapsed[view] = v; save(LS.work, WB.collapsed); }

  // 将图标描述转为 HTML 片段
  function iconHTML(desc) {
    if (desc && desc.type === 'img') return '<img class="nav-ic-img" src="' + esc(desc.value) + '" alt="">';
    if (desc && desc.type === 'svg') return desc.value;
    return '';
  }
  // 取一级导航当前图标（自定义或默认）
  function l1IconDesc(view) {
    var c = WB.nav.l1.custom[view];
    if (c && c.icon) return c.icon;
    var meta = l1Meta(view);
    if (meta) return { type: 'svg', value: ICONS[meta.view] || ICONS.grid };
    return { type: 'svg', value: ICONS.grid };
  }
  // 取二级导航当前图标（自定义或 app 默认 cr(k)）
  function l2IconDesc(item) {
    if (item.icon) return item.icon;
    var svg = '';
    try { svg = window.cr ? window.cr(item.k) : ''; } catch (e) { svg = ''; }
    if (!svg) svg = ICONS.note;
    return { type: 'svg', value: svg };
  }

  /* ===================================================================
   * 侧栏顶：Logo + 标题 + 副标题
   * 沿用 app 已有的 wsName / wsSub / wsIcon（zl() 读取，Rl() 写入）
   * =================================================================== */
  WB.applyBrand = function () {
    var sideTop = Q('.side-top');
    if (!sideTop) return;
    var cfg = {};
    try { cfg = window.zl ? window.zl() || {} : {}; } catch (e) { cfg = {}; }
    var wsIcon = String(cfg.wsIcon || '').trim();
    var wsName = String(cfg.wsName || '').trim() || '阿龙教师工作台';
    var wsSub = String(cfg.wsSub || '').trim() || 'just do it!';

    // —— logo：正方形，显示首页设置里的图片；无图时用「生成式」默认头像（渐变底 + 首字）——
    var logo = sideTop.querySelector('.side-logo');
    if (!logo) {
      logo = document.createElement('div');
      logo.className = 'side-logo';
      sideTop.insertBefore(logo, sideTop.firstChild);
    }
    if (wsIcon) {
      logo.classList.add('has');
      logo.style.backgroundImage = 'url("' + wsIcon.replace(/"/g, '\\"') + '")';
      logo.style.backgroundSize = 'cover';
      logo.style.backgroundPosition = 'center';
      logo.innerHTML = '';
    } else {
      logo.classList.remove('has');
      logo.style.backgroundImage = '';
      logo.innerHTML = '<span class="wb-logo-ch">' + esc((wsName || '师').slice(0, 1)) + '</span>';
    }

    // —— 信息区：标题 + 副标题（竖排），保证与 logo 并排时也不错位 ——
    var tit = sideTop.querySelector('.side-tit');
    var info = sideTop.querySelector('.side-info');
    if (!info) {
      info = document.createElement('div');
      info.className = 'side-info';
      if (tit) { sideTop.insertBefore(info, tit); info.appendChild(tit); }
      else sideTop.insertBefore(info, logo.nextSibling);
    } else if (tit && tit.parentNode !== info) {
      info.appendChild(tit);
    }
    if (tit) tit.textContent = wsName;
    var sub = info.querySelector('.wb-sub');
    if (!sub) { sub = document.createElement('div'); sub.className = 'wb-sub'; info.appendChild(sub); }
    sub.textContent = wsSub;
  };

  /* ===================================================================
   * 「我的」页增强：去个人资料、改名、插"首页设置"分组 + 导航设置入口
   * =================================================================== */
  WB.enhanceMePage = function () {
    var panel = Q('#meBody .me-panel');
    if (!panel) return;

    // 1) 移除个人资料设置
    var prof = panel.querySelector('.me-item[data-msec-wrap="profile"]');
    if (prof) prof.parentNode.removeChild(prof);

    // 2) 工作台品牌 -> 工作台设置
    var brandCard = panel.querySelector('.me-item[data-msec-wrap="brand"]');
    if (brandCard) {
      var mt = brandCard.querySelector('.me-item-h .mt');
      if (mt) mt.textContent = '工作台设置';
      // 在品牌卡内追加"从图标库选择"按钮（避免重复）
      if (!brandCard.querySelector('#wbWsLibBtn')) {
        var upRow = brandCard.querySelector('.ws-up-a');
        if (upRow) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'btn ghost sm'; b.id = 'wbWsLibBtn'; b.textContent = '图标库';
          b.addEventListener('click', function (ev) {
            ev.stopPropagation(); ev.preventDefault();
            WB.openIconLibrary(function (desc) {
              if (desc.type === 'img') {
                try { window.Rl({ wsIcon: desc.value }); } catch (e) {}
                WB.applyBrand(); if (window.Jl) window.Jl();
              } else { WB.toast('工作台图标请选择图片类图标'); }
            }, 'img');
          });
          upRow.appendChild(b);
        }
      }
    }

    // 3) 首页设置分组
    var group = panel.querySelector('.wb-home-set');
    if (!group) {
      group = document.createElement('div');
      group.className = 'wb-home-set';
      group.innerHTML = '<div class="wb-group-h"><span class="wb-group-t">首页设置</span><span class="wb-group-d">工作台外观与导航个性化</span></div>';
      panel.insertBefore(group, panel.firstChild);
    }
    // 把工作台设置卡移入分组
    if (brandCard && brandCard.parentNode !== group) group.appendChild(brandCard);

    // 4) 导航设置入口卡
    var navCard = group.querySelector('.wb-navset');
    if (!navCard) {
      navCard = document.createElement('div');
      navCard.className = 'me-item wb-navset';
      navCard.setAttribute('data-msec-wrap', 'navset');
      navCard.innerHTML =
        '<button class="me-item-h" type="button">' +
        '<span class="mi">' + ICONS.gear + '</span>' +
        '<span class="mt">导航设置</span>' +
        '<span class="ms">一级/二级导航名称、图标、排序</span>' +
        '<svg class="mc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>' +
        '</button>';
      navCard.querySelector('.me-item-h').addEventListener('click', function (ev) {
        ev.stopPropagation(); ev.preventDefault();
        WB.openNavSettings();
      });
      group.appendChild(navCard);
    }
  };

  /* ===================================================================
   * 导航设置弹窗
   * =================================================================== */
  var dragData = null;

  WB.openNavSettings = function () {
    var draft = deepClone(WB.nav);
    // 确保 me 字段
    if (!draft.me) draft.me = { label: '我的', icon: null };

    var mask = document.createElement('div');
    mask.className = 'wb-modal-mask';
    mask.innerHTML =
      '<div class="wb-modal wb-navset-modal">' +
      '<div class="wb-modal-h"><b>导航设置</b><button class="wb-x" type="button">✕</button></div>' +
      '<div class="wb-modal-b">' +
      '  <div class="wb-sec"><div class="wb-sec-t">一级导航<small>拖动排序；"我的"固定在底部，不参与排序</small></div><div class="wb-list" id="wbL1List"></div></div>' +
      '  <div class="wb-sec"><div class="wb-sec-t">二级导航<small>改名/换图标；拖到一级导航上可改变所属；也可用下拉选择所属</small></div><div class="wb-list" id="wbL2List"></div></div>' +
      '</div>' +
      '<div class="wb-modal-f"><button class="btn ghost" id="wbNavCancel" type="button">取消</button><button class="btn primary" id="wbNavSave" type="button">保存</button></div>' +
      '</div>';
    document.body.appendChild(mask);

    function render() {
      // 一级导航
      var l1 = Q('#wbL1List', mask);
      l1.innerHTML = '';
      draft.l1.order.forEach(function (view) {
        var meta = l1Meta(view);
        if (!meta) return;
        var c = draft.l1.custom[view] || {};
        var label = c.label || meta.label;
        var desc = (c.icon) ? c.icon : { type: 'svg', value: ICONS[meta.view] || ICONS.grid };
        var row = document.createElement('div');
        row.className = 'wb-row wb-l1';
        row.draggable = true;
        row.setAttribute('data-view', view);
        row.innerHTML =
          '<span class="wb-grip">⠿</span>' +
          '<span class="wb-ic" data-ic="' + esc(view) + '">' + iconHTML(desc) + '</span>' +
          '<input class="wb-in" type="text" value="' + esc(label) + '" maxlength="8">' +
          '<span class="wb-tag">' + (meta.group ? '可展开' : '普通') + '</span>';
        // 图标点击 -> 图标库
        row.querySelector('.wb-ic').addEventListener('click', function (ev) {
          ev.stopPropagation();
          WB.openIconLibrary(function (d) {
            draft.l1.custom[view] = draft.l1.custom[view] || {};
            draft.l1.custom[view].icon = d;
            render();
          });
        });
        // 名称
        row.querySelector('.wb-in').addEventListener('input', function (ev) {
          draft.l1.custom[view] = draft.l1.custom[view] || {};
          draft.l1.custom[view].label = ev.target.value;
        });
        // 拖拽
        row.addEventListener('dragstart', function (ev) { dragData = { type: 'l1', id: view }; ev.dataTransfer.effectAllowed = 'move'; });
        row.addEventListener('dragover', function (ev) { ev.preventDefault(); row.classList.add('over'); });
        row.addEventListener('dragleave', function () { row.classList.remove('over'); });
        row.addEventListener('drop', function (ev) {
          ev.preventDefault(); row.classList.remove('over');
          if (!dragData) return;
          if (dragData.type === 'l1' && dragData.id !== view) {
            var arr = draft.l1.order, from = arr.indexOf(dragData.id);
            arr.splice(from, 1);
            var to = arr.indexOf(view);
            arr.splice(to, 0, dragData.id);
          } else if (dragData.type === 'l2') {
            // 二级拖到一级 -> 改父级
            var it = null; for (var i = 0; i < draft.l2.length; i++) if (draft.l2[i].k === dragData.id) it = draft.l2[i];
            if (it) it.parent = view;
          }
          dragData = null; render();
        });
        l1.appendChild(row);
      });

      // 二级导航
      var l2 = Q('#wbL2List', mask);
      l2.innerHTML = '';
      draft.l2.forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'wb-row wb-l2';
        row.draggable = true;
        row.setAttribute('data-k', item.k);
        var desc = item.icon || l2IconDesc(item);
        var opts = draft.l1.order.map(function (v) {
          return '<option value="' + esc(v) + '"' + (item.parent === v ? ' selected' : '') + '>' + esc(l1Label(v)) + '</option>';
        }).join('');
        row.innerHTML =
          '<span class="wb-grip">⠿</span>' +
          '<span class="wb-ic" data-ic="' + esc(item.k) + '">' + iconHTML(desc) + '</span>' +
          '<input class="wb-in" type="text" value="' + esc(item.n) + '" maxlength="8">' +
          '<select class="wb-sel">' + opts + '</select>';
        row.querySelector('.wb-ic').addEventListener('click', function (ev) {
          ev.stopPropagation();
          WB.openIconLibrary(function (d) { item.icon = d; render(); });
        });
        row.querySelector('.wb-in').addEventListener('input', function (ev) { item.n = ev.target.value; });
        row.querySelector('.wb-sel').addEventListener('change', function (ev) { item.parent = ev.target.value; });
        row.addEventListener('dragstart', function (ev) { dragData = { type: 'l2', id: item.k }; ev.dataTransfer.effectAllowed = 'move'; });
        row.addEventListener('dragover', function (ev) { ev.preventDefault(); row.classList.add('over'); });
        row.addEventListener('dragleave', function () { row.classList.remove('over'); });
        row.addEventListener('drop', function (ev) {
          ev.preventDefault(); row.classList.remove('over');
          if (dragData && dragData.type === 'l2' && dragData.id !== item.k) {
            var arr = draft.l2, from = -1; for (var i = 0; i < arr.length; i++) if (arr[i].k === dragData.id) from = i;
            if (from >= 0) { var moved = arr.splice(from, 1)[0]; var to = -1; for (var j = 0; j < arr.length; j++) if (arr[j].k === item.k) to = j; arr.splice(to, 0, moved); }
          }
          dragData = null; render();
        });
        l2.appendChild(row);
      });
    }
    render();

    mask.querySelector('.wb-x').addEventListener('click', function () { document.body.removeChild(mask); });
    mask.addEventListener('click', function (ev) { if (ev.target === mask) document.body.removeChild(mask); });
    Q('#wbNavCancel', mask).addEventListener('click', function () { document.body.removeChild(mask); });
    Q('#wbNavSave', mask).addEventListener('click', function () {
      WB.nav = draft;
      // 清理空 custom
      var c = WB.nav.l1.custom;
      Object.keys(c).forEach(function (k) { if (!c[k] || (!c[k].label && !c[k].icon)) delete c[k]; });
      save(LS.nav, WB.nav);
      WB.applyNavToTabs();
      WB.renderSideSub();
      WB.applyBrand();
      document.body.removeChild(mask);
      WB.toast('导航设置已保存');
    });
  };

  /* ===================================================================
   * 应用导航配置到左侧实际导航
   * =================================================================== */
  WB.applyNavToTabs = function () {
    var tabs = Q('#tabs');
    if (!tabs) return;
    if (!Object.keys(origIcon).length) {
      // 记录原始图标
      $('[data-view]', tabs).forEach(function (btn) {
        var v = btn.getAttribute('data-view');
        var svg = btn.querySelector('svg');
        if (v && svg) origIcon[v] = svg.outerHTML;
      });
    }
    var order = WB.nav.l1.order;
    // 先把 #sideSub 从流中摘除，最后插回「分组」一级导航之后，
    // 保证二级菜单显示在该一级下方，而不是被 insertBefore 一路推到末尾
    var sub = tabs.querySelector('#sideSub');
    if (sub && sub.parentNode === tabs) sub.parentNode.removeChild(sub);
    // 重排一级导航（不含 me）
    order.forEach(function (view) {
      var btn = tabs.querySelector('.tab[data-view="' + cssEsc(view) + '"]');
      if (btn && btn.parentNode === tabs) tabs.appendChild(btn);
    });
    // 将 #sideSub 插回分组一级导航之后
    var gtab = null;
    for (var gi = 0; gi < order.length; gi++) {
      if (isGroup(order[gi])) { gtab = tabs.querySelector('.tab[data-view="' + cssEsc(order[gi]) + '"]'); break; }
    }
    if (sub) { if (gtab) tabs.insertBefore(sub, gtab.nextSibling); else tabs.appendChild(sub); }

    // 更新每个一级导航的标签/图标/分组
    order.forEach(function (view) {
      var btn = tabs.querySelector('.tab[data-view="' + cssEsc(view) + '"]');
      if (!btn) return;
      var c = WB.nav.l1.custom[view] || {};
      var label = c.label || l1Label(view);
      setTabLabel(btn, label);
      // 图标（稳定插槽 .wb-l1-ic，避免误伤 .tw-chev）
      var slot = btn.querySelector('.wb-l1-ic');
      if (!slot) {
        var firstSvg = btn.querySelector('svg:not(.tw-chev)');
        slot = document.createElement('span');
        slot.className = 'wb-l1-ic';
        if (firstSvg) btn.replaceChild(slot, firstSvg);
        else btn.insertAdjacentElement('afterbegin', slot);
      }
      slot.innerHTML = iconHTML(l1IconDesc(view));
      // 分组（有二级导航 -> 展开/收起）
      if (isGroup(view)) {
        btn.classList.add('group');
        if (!btn.querySelector('.tw-chev')) {
          var ch = document.createElement('span');
          ch.className = 'tw-lab';
          // 插入 chevron 在 label 之后
          btn.insertAdjacentHTML('beforeend', '<svg class="tw-chev" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>');
        }
        btn.classList.toggle('collapsed', getCollapsed(view));
      } else {
        btn.classList.remove('group', 'collapsed');
        var cv = btn.querySelector('.tw-chev'); if (cv) cv.parentNode.removeChild(cv);
      }
    });

    // 「我的」固定底栏
    WB.fixMeToFooter();

    // 同步移动端
    var mNav = Q('#mNav');
    if (mNav) {
      order.concat(['me']).forEach(function (view) {
        var mb = mNav.querySelector('.tab[data-view="' + cssEsc(view) + '"]');
        if (!mb) return;
        var c = WB.nav.l1.custom[view] || {};
        var label = (view === 'me') ? (WB.nav.me.label || '我的') : (c.label || l1Label(view));
        setTabLabel(mb, label);
      });
      var mme = mNav.querySelector('.tab[data-view="me"]');
      if (mme && WB.nav.me.icon) {
        var s = mme.querySelector('.wb-l1-ic');
        if (!s) { var fs = mme.querySelector('svg:not(.tw-chev)'); s = document.createElement('span'); s.className = 'wb-l1-ic'; if (fs) mme.replaceChild(s, fs); else mme.insertAdjacentElement('afterbegin', s); }
        s.innerHTML = iconHTML(WB.nav.me.icon);
      }
    }
  };

  WB.fixMeToFooter = function () {
    var sideNav = Q('#sideNav');
    var tabs = Q('#tabs');
    if (!sideNav || !tabs) return;
    var meBtn = tabs.querySelector('.tab[data-view="me"]');
    if (!meBtn) return;
    var foot = sideNav.querySelector('.side-foot');
    if (!foot) {
      foot = document.createElement('div');
      foot.className = 'side-foot';
      sideNav.appendChild(foot);
    }
    // 应用 my 自定义
    if (WB.nav.me.label) {
      setTabLabel(meBtn, WB.nav.me.label);
    }
    if (WB.nav.me.icon) {
      var s = meBtn.querySelector('.wb-l1-ic');
      if (!s) { var fs = meBtn.querySelector('svg:not(.tw-chev)'); s = document.createElement('span'); s.className = 'wb-l1-ic'; if (fs) meBtn.replaceChild(s, fs); else meBtn.insertAdjacentElement('afterbegin', s); }
      s.innerHTML = iconHTML(WB.nav.me.icon);
    }
    foot.appendChild(meBtn);
  };

  /* ===================================================================
   * 左侧二级导航渲染（接管 pd）
   * =================================================================== */
  WB.renderSideSub = function () {
    var sub = Q('#sideSub');
    if (!sub) return;
    // 树状：遍历所有「分组」一级，只要处于展开状态就渲染其二级项——与当前激活视图无关，
    // 这样在首页/日常等任意页面都能看到「工作」下的子项，切换页面也不消失。
    var html = '';
    WB.nav.l1.order.forEach(function (g) {
      if (!isGroup(g) || getCollapsed(g)) return;
      WB.nav.l2.forEach(function (it) {
        if (it.parent !== g) return;
        var desc = it.icon || l2IconDesc(it);
        var on = (window.Z && window.Z.workSub === it.k) ? ' on' : '';
        html += '<button class="ssub' + on + '" data-side-sub="' + esc(it.k) + '"><span class="ssi">' + iconHTML(desc) + '</span><span class="sn">' + esc(it.n) + '</span></button>';
      });
    });
    // 同步分组箭头方向
    WB.nav.l1.order.forEach(function (g) {
      if (!isGroup(g)) return;
      var wt = Q('#sideNav .tab.group[data-view="' + cssEsc(g) + '"]');
      if (wt) wt.classList.toggle('collapsed', getCollapsed(g));
    });
    var newClass = 'side-sub';
    var newDisplay = html ? '' : 'none';
    // 幂等：内容/显隐未变则不写，避免触发 MutationObserver 死循环
    if (sub.className === newClass && sub.innerHTML === html && sub.style.display === newDisplay) return;
    sub.className = newClass;
    sub.innerHTML = html;
    sub.style.display = newDisplay;
  };

  /* ===================================================================
   * 侧栏点击：仅「箭头」负责分组展开/收起；点击标签仍交给原站导航
   * =================================================================== */
  function onSideNavClick(ev) {
    var chev = ev.target.closest ? ev.target.closest('#sideNav .tab.group .tw-chev') : null;
    if (!chev) return; // 非箭头：交给 app 的 .tab[data-view] 导航逻辑
    var tab = chev.closest('.tab.group');
    var view = tab && tab.getAttribute('data-view');
    if (!view || !isGroup(view)) return;
    ev.stopPropagation(); ev.preventDefault();
    setCollapsed(view, !getCollapsed(view));
    WB.renderSideSub();
    // 防御：app 导航时可能重写 #sideSub，下一拍再同步一次
    setTimeout(WB.renderSideSub, 0);
  }

  /* ===================================================================
   * 公共图标库
   * =================================================================== */
  WB.openIconLibrary = function (onPick, onlyType) {
    var mask = document.createElement('div');
    mask.className = 'wb-modal-mask';
    var gridHtml = '';
    // 默认图标
    ICON_KEYS.forEach(function (k) {
      gridHtml += '<button class="wb-ic-cell" type="button" data-kind="def" data-key="' + esc(k) + '" title="' + esc(k) + '">' + ICONS[k] + '</button>';
    });
    // 已上传
    WB.icons.forEach(function (ic) {
      gridHtml += '<button class="wb-ic-cell" type="button" data-kind="up" data-id="' + esc(ic.id) + '" title="' + esc(ic.name) + '"><img src="' + esc(ic.value) + '" alt=""></button>';
    });

    mask.innerHTML =
      '<div class="wb-modal wb-lib-modal">' +
      '<div class="wb-modal-h"><b>图标库</b><button class="wb-x" type="button">✕</button></div>' +
      '<div class="wb-modal-b">' +
      '  <div class="wb-lib-bar"><span class="wb-lib-hint">系统默认图标 · 教师上传（支持动图，所有教师可选）</span>' +
      '    <label class="btn primary sm">上传图标<input id="wbUpFile" type="file" accept="image/*" hidden></label></div>' +
      '  <div class="wb-ic-grid" id="wbIcGrid">' + gridHtml + '</div>' +
      '</div>' +
      '<div class="wb-modal-f"><button class="btn ghost" id="wbLibCancel" type="button">取消</button></div>' +
      '</div>';
    document.body.appendChild(mask);

    mask.querySelector('.wb-x').addEventListener('click', function () { document.body.removeChild(mask); });
    mask.querySelector('#wbLibCancel').addEventListener('click', function () { document.body.removeChild(mask); });
    mask.addEventListener('click', function (ev) { if (ev.target === mask) document.body.removeChild(mask); });

    mask.querySelector('#wbUpFile').addEventListener('change', function (ev) {
      var f = ev.target.files && ev.target.files[0];
      if (!f) return;
      var okType = /^image\//.test(f.type) || /\.(png|jpe?g|gif|webp|bmp|ico|svg|avif|heic|heif|tiff?)$/i.test(f.name);
      if (!okType) { WB.toast('请选择图片文件'); ev.target.value = ''; return; }
      var reader = new FileReader();
      reader.onload = function () {
        var val = String(reader.result || '');
        var rec = { id: 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), name: f.name || '图标', value: val };
        WB.icons.push(rec);
        try { save(LS.icons, WB.icons); } catch (e) { WB.toast('图标过多，存储空间不足'); WB.icons.pop(); return; }
        var g = Q('#wbIcGrid', mask);
        var cell = document.createElement('button');
        cell.className = 'wb-ic-cell'; cell.type = 'button'; cell.setAttribute('data-kind', 'up'); cell.setAttribute('data-id', rec.id); cell.title = rec.name;
        cell.innerHTML = '<img src="' + esc(rec.value) + '" alt="">';
        g.appendChild(cell);
        WB.toast('已上传到公共图标库');
        ev.target.value = '';
      };
      reader.onerror = function () { WB.toast('读取失败'); };
      reader.readAsDataURL(f);
    });

    Q('#wbIcGrid', mask).addEventListener('click', function (ev) {
      var cell = ev.target.closest ? ev.target.closest('.wb-ic-cell') : null;
      if (!cell) return;
      var kind = cell.getAttribute('data-kind');
      var desc;
      if (kind === 'def') {
        var k = cell.getAttribute('data-key');
        desc = { type: 'svg', value: ICONS[k] };
      } else {
        var id = cell.getAttribute('data-id');
        var rec = null; for (var i = 0; i < WB.icons.length; i++) if (WB.icons[i].id === id) rec = WB.icons[i];
        if (!rec) return;
        desc = { type: 'img', value: rec.value };
      }
      if (onlyType === 'img' && desc.type !== 'img') { WB.toast('请选择图片类图标'); return; }
      document.body.removeChild(mask);
      if (onPick) onPick(desc);
    });
  };

  /* ===================================================================
   * 轻量提示
   * =================================================================== */
  WB.toast = function (msg) {
    var t = Q('#wbToast');
    if (!t) { t = document.createElement('div'); t.id = 'wbToast'; t.className = 'wb-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(WB._tt); WB._tt = setTimeout(function () { t.classList.remove('show'); }, 2200);
  };

  function cssEsc(s) { return String(s).replace(/"/g, '\\"'); }

  /* ===================================================================
   * 初始化 + 包装 app 全局函数
   * =================================================================== */
  function init() {
    // 注入样式
    injectStyle();

    // 包装 id（我的页渲染后增强）
    if (typeof window.id === 'function') { var _id = window.id; window.id = function () { _id.apply(window, arguments); WB.enhanceMePage(); }; }
    // 包装 Jl（侧栏顶品牌同步）
    if (typeof window.Jl === 'function') { var _Jl = window.Jl; window.Jl = function () { _Jl.apply(window, arguments); WB.applyBrand(); }; }
    // 接管 pd（二级导航渲染）
    if (typeof window.pd === 'function') { window.pd = function () { WB.renderSideSub(); }; }
    // 包装 bp（视图切换后同步二级导航）
    if (typeof window.bp === 'function') { var _bp = window.bp; window.bp = function () { _bp.apply(window, arguments); WB.renderSideSub(); }; }

    // 侧栏点击（分组展开/收起）
    var sideNav = Q('#sideNav');
    if (sideNav) sideNav.addEventListener('click', onSideNavClick, true);

    // 首次应用
    WB.applyNavToTabs();
    WB.applyBrand();
    WB.renderSideSub();
    WB.enhanceMePage();

    // #meBody 兜底：id() 重建后再次增强（幂等，会收敛）
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () { WB.enhanceMePage(); });
      var mb = Q('#meBody'); if (mb) mo.observe(mb, { childList: true });
    }
    // #sideSub 兜底已移除：app 自身会渲染二级导航（pd()），此处的 MutationObserver
    // 会在导航时被 app 重写 #sideSub 反复触发，形成 renderSideSub ⇄ 观察器 的无限循环，
    // 导致整页 CPU 占满、卡死（表现为“左侧导航都不能点击 / 无法使用”）。
    // 改为仅在初始化、箭头点击、meBody 增强时按需调用 WB.renderSideSub()，不再自观察。

    /* ===================================================================
     * 三端同步增强：切回页面 / 窗口重新聚焦时，自动从云端拉取最新数据
     * （等同点击「我的 → 数据 → 立即同步」，走应用自己的 Xt 全量拉取路径）
     * 仅在云端模式生效；60s 防抖；同步中跳过。
     * =================================================================== */
    var lastAutoSync = 0;
    function autoSync() {
      if (window.__WB_PREVIEW) return;                 // 预览/离线模式没有云端
      if (typeof window.__wbSync !== 'function') return;
      if (window.Z && (Z.retrying || !Z.dataLoaded && Z.online)) return;
      var now = Date.now();
      if (now - lastAutoSync < 60000) return;
      lastAutoSync = now;
      try { window.__wbSync(); } catch (e) {}
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') autoSync();
    });
    window.addEventListener('focus', autoSync);
  }

  function injectStyle() {
    if (Q('#wbEnhStyle')) return;
    var s = document.createElement('style');
    s.id = 'wbEnhStyle';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var CSS = [
    /* 侧栏顶：logo + 标题 + 副标题 */
    '#sideNav .side-top{display:flex;align-items:center;gap:10px;}',
    '#sideNav .side-tit::before{display:none !important;}',                 /* 去掉原站那个圆形装饰 */
    '.side-logo{width:40px;height:40px;border-radius:12px !important;background:#eef2fb center/cover no-repeat;display:flex;align-items:center;justify-content:center;flex:0 0 auto;overflow:hidden;box-shadow:0 2px 8px rgba(30,80,200,.14);}',
    '.side-logo.has{background-size:cover;background-position:center;}',
    '.side-logo:not(.has){background:linear-gradient(135deg,#6FA0F2,#3b6cff);}',  /* 无图：生成式默认头像底 */
    '.wb-logo-ch{font-size:17px;font-weight:800;color:#fff;line-height:1;}',
    '.side-info{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto;}',
    '#sideNav .side-info .side-tit{display:block;flex:0 0 auto;font-size:14px !important;font-weight:700;line-height:1.2;color:var(--ink,#1d2129);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}',
    '.wb-sub{font-size:11.5px;color:var(--ink3,#86909c);line-height:1.25;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.side-top .side-x{position:absolute;top:12px;right:12px;}',

    /* 滚动 + 底部固定（我的固定在底部，不用横线分割，靠 margin-top:auto 顶到底部） */
    '#sideNav{display:flex;flex-direction:column;height:100%;}',
    '#tabs{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;padding-bottom:4px;}',
    '.side-foot{flex:0 0 auto;margin-top:auto;padding:10px 8px 12px;}',
    '.side-foot .tab{width:100%;}',

    /* 树状：分组箭头（默认收起即向右；展开朝下）。确保始终可见并带旋转动画 */
    '#sideNav .tab.group .tw-chev{display:block !important;opacity:.6;margin-left:auto;transition:transform .18s ease;}',
    '#sideNav .tab.group.collapsed .tw-chev{transform:rotate(-90deg);}',

    /* 去掉原站「日常」上方的分隔线 + 分段间距，树状结构下保持紧凑（无中间分割线） */
    '#tabs .tab[data-view="daily"]::before{display:none !important;}',
    '#tabs .tab[data-view="daily"]{margin-top:0 !important;}',

    /* 树状：二级子项缩进成树、显示自身图标，纯缩进无竖线；空容器收零高度避免留白 */
    '#sideNav #sideSub{display:flex;flex-direction:column;gap:2px;margin:0;padding:2px 0 6px;}',
    '#sideNav #sideSub:empty{display:none !important;}',
    '#sideNav .ssub{display:flex;align-items:center;gap:9px;width:100%;padding:7px 12px 7px 42px !important;border-radius:9px !important;border:0;background:transparent;font-size:13px !important;color:var(--ink2) !important;text-align:left;cursor:pointer;}',
    '#sideNav .ssub .ssi{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;flex:0 0 auto;color:var(--ink3);}',
    '#sideNav .ssub .ssi svg{width:15px;height:15px;opacity:.8}',
    '#sideNav .ssub:hover{background:var(--card2);color:var(--ink) !important}',
    '#sideNav .ssub.on{background:var(--brand-l) !important;color:var(--brand) !important;font-weight:600}',
    '#sideNav .ssub.on .ssi{color:var(--brand)}',
    '.wb-l1-ic{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;}',

    /* 导航图标图片 */
    '.nav-ic-img{width:16px;height:16px;border-radius:4px;object-fit:cover;display:block;}',
    '.ssub .ssi .nav-ic-img{width:15px;height:15px;}',
    '.side-logo.has{}',

    /* 首页设置分组 */
    '.wb-home-set{margin-bottom:6px;}',
    '.wb-group-h{display:flex;align-items:baseline;gap:8px;padding:10px 14px 6px;}',
    '.wb-group-t{font-size:13px;font-weight:700;color:var(--ink,#1d2129);}',
    '.wb-group-d{font-size:11px;color:var(--ink3,#86909c);}',
    '.wb-navset{cursor:pointer;}',

    /* 弹窗通用 */
    '.wb-modal-mask{position:fixed;inset:0;background:rgba(20,28,45,.45);display:flex;align-items:center;justify-content:center;z-index:9999;}',
    '.wb-modal{width:min(560px,92vw);max-height:86vh;background:var(--card,#fff);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden;}',
    '.wb-modal-h{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--line,#eef);font-size:15px;font-weight:700;}',
    '.wb-x{border:none;background:none;font-size:18px;color:var(--ink3,#86909c);cursor:pointer;line-height:1;}',
    '.wb-modal-b{padding:14px 18px;overflow-y:auto;}',
    '.wb-modal-f{display:flex;justify-content:flex-end;gap:10px;padding:12px 18px;border-top:1px solid var(--line,#eef);}',
    '.wb-sec{margin-bottom:16px;}',
    '.wb-sec-t{font-size:13px;font-weight:700;margin-bottom:8px;display:flex;flex-direction:column;gap:2px;}',
    '.wb-sec-t small{font-weight:400;color:var(--ink3,#86909c);font-size:11px;}',
    '.wb-list{display:flex;flex-direction:column;gap:8px;}',
    '.wb-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line,#eef);border-radius:10px;background:var(--card,#fff);}',
    '.wb-row.over{border-color:#3b6cff;background:#f3f7ff;}',
    '.wb-grip{cursor:grab;color:var(--ink3,#a9aeb8);font-size:16px;user-select:none;}',
    '.wb-ic{width:30px;height:30px;border:1px dashed var(--line,#d8dde6);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#3b6cff;cursor:pointer;flex:0 0 auto;overflow:hidden;}',
    '.wb-ic svg{width:18px;height:18px;}',
    '.wb-ic img{width:22px;height:22px;border-radius:5px;object-fit:cover;}',
    '.wb-in{flex:1 1 auto;height:34px;border:1px solid var(--line,#e5e8ef);border-radius:8px;padding:0 10px;font-size:14px;outline:none;background:var(--card,#fff);color:var(--ink,#1d2129);}',
    '.wb-in:focus{border-color:#3b6cff;}',
    '.wb-sel{height:34px;border:1px solid var(--line,#e5e8ef);border-radius:8px;padding:0 6px;font-size:13px;background:var(--card,#fff);color:var(--ink,#1d2129);}',
    '.wb-tag{font-size:11px;color:var(--ink3,#86909c);}',

    /* 图标库 */
    '.wb-lib-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;}',
    '.wb-lib-hint{font-size:11.5px;color:var(--ink3,#86909c);}',
    '.wb-ic-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:8px;}',
    '.wb-ic-cell{aspect-ratio:1;border:1px solid var(--line,#e5e8ef);border-radius:10px;background:var(--card,#fff);display:flex;align-items:center;justify-content:center;color:#3b6cff;cursor:pointer;overflow:hidden;}',
    '.wb-ic-cell:hover{border-color:#3b6cff;background:#f3f7ff;}',
    '.wb-ic-cell svg{width:20px;height:20px;}',
    '.wb-ic-cell img{width:30px;height:30px;border-radius:6px;object-fit:cover;}',

    /* 每日一句「换一句」：原站 .ov-pf .hpq-swap 用白字（白底卡片上不可见），此处提权改回深色并加刷新符号 */
    '#view-overview .ov-pf.ov-pf-x .hpq-h .hpq-swap{color:var(--ink2,#4e5969) !important;background:var(--line2,#eef1f6) !important;border:1px solid var(--line,#e5e8ef) !important;border-radius:999px !important;padding:3px 10px !important;font-size:12px !important;opacity:1 !important;visibility:visible !important;display:inline-flex !important;align-items:center;gap:3px;}',
    '#view-overview .ov-pf.ov-pf-x .hpq-h .hpq-swap::before{content:"↻";font-size:13px;line-height:1;}',
    '#view-overview .ov-pf.ov-pf-x .hpq-h .hpq-swap:hover{color:var(--brand,#3b6cff) !important;border-color:var(--brand,#3b6cff) !important;}',

    /* toast */
    '.wb-toast{position:fixed;left:50%;bottom:40px;transform:translateX(-50%) translateY(10px);background:rgba(20,28,45,.92);color:#fff;padding:9px 16px;border-radius:10px;font-size:13px;opacity:0;pointer-events:none;transition:.2s;z-index:10000;}',
    '.wb-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}'
  ].join('\n');

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
