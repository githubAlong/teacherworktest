/* ============================================================
 * 阿龙教师工作台 · 云连接版（V2：可配置导航 + 公共图标库）
 * 技术栈：原生 HTML/CSS/JS + WorkBuddy Cloud（CDN SDK）
 * ============================================================ */

/* ---------- 1. 配置与 SDK 初始化 ---------- */
const PUBLIC_CONFIG = {
  endpoint: 'https://teacher-desk-95026.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey: 'wbpk_ym86d3yXK7ymy90FAo7gnE_MlQ2FmganZS1wKVWgNil0DaqrxLkUYuc',
};

const cloud = WorkBuddyCloud.createWorkBuddyCloud({
  endpoint: PUBLIC_CONFIG.endpoint,
  oauthRelayBaseUrl: PUBLIC_CONFIG.oauthRelayBaseUrl,
  publishableKey: PUBLIC_CONFIG.publishableKey,
});

/* ---------- 2. 工具函数 ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

let toastTimer = null;
function toast(msg, type = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast' + (type ? ' ' + type : '');
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

function openModal(html) {
  $('#modal-panel').innerHTML = html;
  $('#modal-mask').hidden = false;
}
function closeModal() { $('#modal-mask').hidden = true; $('#modal-panel').innerHTML = ''; }

function bindClose() {
  $$('#modal-panel [data-close]').forEach((b) => { b.onclick = closeModal; });
  $('#modal-mask').onclick = (e) => { if (e.target === $('#modal-mask')) closeModal(); };
}

function confirmDialog(msg) {
  return new Promise((resolve) => {
    openModal(`
      <div class="modal-title">请确认</div>
      <p style="color:var(--ink-2);margin-bottom:8px">${escapeHtml(msg)}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>取消</button>
        <button class="btn btn-primary" id="confirm-yes">确认</button>
      </div>
    `);
    $('#confirm-yes').onclick = () => { closeModal(); resolve(true); };
    $$('[data-close]').forEach((b) => { b.onclick = () => { closeModal(); resolve(false); }; });
    $('#modal-mask').onclick = (e) => { if (e.target === $('#modal-mask')) { closeModal(); resolve(false); } };
  });
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtDate(iso) {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return String(iso);
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function greeting() {
  const h = new Date().getHours();
  if (h < 5) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

/* ---------- 3. 图标渲染与系统图标库 ---------- */
function iconHTML(value, size) {
  size = size || 18;
  if (value && typeof value === 'string' && value.startsWith('data:')) {
    return `<img class="ic-img" src="${value}" alt="" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:6px">`;
  }
  return `<span class="ic-emoji" style="font-size:${size}px;line-height:1">${escapeHtml(value || '📄')}</span>`;
}

function svgIcon(inner, color, sw) {
  color = color || '#1F60F5';
  sw = sw || 1.8;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const SYSTEM_ICONS = [
  { name: 'home', data: svgIcon('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>') },
  { name: 'work', data: svgIcon('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>') },
  { name: 'book', data: svgIcon('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>') },
  { name: 'calendar', data: svgIcon('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>') },
  { name: 'note', data: svgIcon('<path d="M5 3h11l4 4v14H5z"/><path d="M16 3v4h4M9 12h7M9 16h5"/>') },
  { name: 'wrench', data: svgIcon('<path d="M14 7a4 4 0 0 0-5 5l-6 6 3 3 6-6a4 4 0 0 0 5-5l-3 3-3-3z"/>') },
  { name: 'users', data: svgIcon('<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-5-5"/>') },
  { name: 'shield', data: svgIcon('<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>') },
  { name: 'plane', data: svgIcon('<path d="M21 16l-9-4-4-9-2 1 2 8-6 2 1 2 6-2 2 8 2-1z"/>') },
  { name: 'school', data: svgIcon('<path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11v5c0 1 3 3 5 3s5-2 5-3v-5"/>') },
  { name: 'trash', data: svgIcon('<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>') },
  { name: 'user', data: svgIcon('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>') },
  { name: 'star', data: svgIcon('<path d="M12 3l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z"/>') },
  { name: 'gear', data: svgIcon('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>') },
  { name: 'bell', data: svgIcon('<path d="M6 16V10a6 6 0 0 1 12 0v6l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>') },
  { name: 'folder', data: svgIcon('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>') },
  { name: 'chart', data: svgIcon('<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-9"/>') },
  { name: 'clipboard', data: svgIcon('<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1"/>') },
  { name: 'heart', data: svgIcon('<path d="M12 20s-7-4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5-7 9-7 9z"/>') },
  { name: 'bulb', data: svgIcon('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 0 0-4-10z"/>') },
  { name: 'flag', data: svgIcon('<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>') },
  { name: 'image', data: svgIcon('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M3 16l5-4 4 3 3-2 6 5"/>') },
  { name: 'chat', data: svgIcon('<path d="M4 5h16v11H9l-5 4z"/>') },
  { name: 'gift', data: svgIcon('<rect x="3" y="9" width="18" height="11" rx="2"/><path d="M3 13h18M12 9v11M12 9C9 9 8 6 12 6s3 3 0 3"/>') },
];
const EMOJI_CHOICES = ['🏠','💼','📚','📅','📝','🔧','👥','🛡️','✈️','🗑️','👤','⭐','⚙️','🔔','📁','📊','📋','❤️','💡','🚩','🖼️','💬','🎁','📖','🔁','🎯','🌟','🍎','☕','🎵'];

const ICONS_TABLE = 'wb_icons';

async function seedSystemIcons() {
  try {
    const { data } = await cloud.database.from(ICONS_TABLE).select('id').eq('kind', 'system');
    if (data && data.length) return;
    await Promise.all(SYSTEM_ICONS.map((s) =>
      cloud.database.from(ICONS_TABLE).insert({ owner_id: null, name: s.name, kind: 'system', mime: 'image/svg+xml', data: s.data, is_anim: false })));
  } catch (e) { console.warn('seed icons failed', e); }
}

async function loadIconLibrary() {
  try {
    const { data, error } = await cloud.database.from(ICONS_TABLE).select('*').order('created_at', { ascending: true });
    if (error) { console.error(error); return []; }
    return data || [];
  } catch (e) { console.error(e); return []; }
}

async function addIconToLibrary(dataUrl, name) {
  name = name || ('upload-' + Date.now());
  const { error } = await cloud.database.from(ICONS_TABLE).insert({
    owner_id: userId(), name, kind: 'upload', mime: 'image/png', data: dataUrl, is_anim: false,
  });
  if (error) throw error;
}

/* ---------- 4. 用户配置（每教师隔离） ---------- */
const SETTINGS_TABLE = 'wb_settings';
let userConfig = null;       // { id, brand, nav, workCollapsed }
let navOpen = {};            // 展开状态（仅影响的父级）

function userId() { return (currentUser && (currentUser.id || currentUser.phone)) || 'anon'; }

function defaultBrand() { return { icon: '龙', title: '阿龙教师工作台', subtitle: 'just do it!' }; }

function defaultNavTree() {
  return [
    { id: 'home', label: '首页', icon: '🏠', route: 'home' },
    { id: 'work', label: '工作', icon: '💼', route: null, children: [
      { id: 'lessons', label: '上课', icon: '📖', route: 'lessons' },
      { id: 'schedule', label: '课表', icon: '📅', route: 'schedule' },
      { id: 'plans', label: '备课', icon: '📝', route: 'plans' },
      { id: 'maintenance', label: '维修', icon: '🔧', route: 'maintenance' },
      { id: 'attendance', label: '考勤', icon: '👥', route: 'attendance' },
      { id: 'proctoring', label: '监考', icon: '🛡️', route: 'proctoring' },
      { id: 'trips', label: '出差', icon: '✈️', route: 'trips' },
      { id: 'substitutes', label: '代课', icon: '🔁', route: 'substitutes' },
    ] },
    { id: 'tasks', label: '日常', icon: '✅', route: 'tasks', badge: 'taskPending' },
    { id: 'study', label: '学习', icon: '📚', route: 'study' },
    { id: 'classroom', label: '小课堂', icon: '🏫', route: 'classroom' },
    { id: 'trash', label: '回收站', icon: '🗑️', route: 'trash' },
    { id: 'profile', label: '我的', icon: '👤', route: 'profile', pinned: true },
  ];
}

function buildDefaultConfig() { return { brand: defaultBrand(), nav: defaultNavTree(), workCollapsed: true }; }

function safeParse(v, fallback) {
  if (v == null) return fallback;
  if (typeof v === 'object') return v;
  try { const o = JSON.parse(v); return o || fallback; } catch { return fallback; }
}

async function loadConfig() {
  if (!currentUser) { userConfig = buildDefaultConfig(); return; }
  try {
    const { data, error } = await cloud.database.from(SETTINGS_TABLE).select('*').eq('user_id', userId());
    if (error) throw error;
    if (data && data.length) {
      const row = data[0];
      userConfig = {
        id: row.id,
        brand: safeParse(row.brand, defaultBrand()),
        nav: (Array.isArray(safeParse(row.nav, null)) && safeParse(row.nav, null).length) ? safeParse(row.nav, null) : defaultNavTree(),
        workCollapsed: row.work_collapsed !== false,
      };
    } else {
      userConfig = buildDefaultConfig();
      await saveConfig();
    }
  } catch (e) {
    console.warn('load config failed, use default', e);
    userConfig = buildDefaultConfig();
  }
  navOpen = {};
  navOpen['work'] = !userConfig.workCollapsed;
}

async function saveConfig() {
  const payload = {
    user_id: userId(),
    brand: JSON.stringify(userConfig.brand),
    nav: JSON.stringify(userConfig.nav),
    work_collapsed: !!userConfig.workCollapsed,
    updated_at: new Date().toISOString(),
  };
  if (userConfig.id) {
    const { error } = await cloud.database.from(SETTINGS_TABLE).update(payload).eq('id', userConfig.id);
    if (error) throw error;
  } else {
    const { data, error } = await cloud.database.from(SETTINGS_TABLE).insert(payload).select();
    if (error) throw error;
    userConfig.id = data && data[0] && data[0].id;
  }
}

/* ---------- 5. 导航树辅助 ---------- */
function findNode(arr, id) {
  for (const n of arr) {
    if (n.id === id) return { node: n, arr, index: arr.indexOf(n) };
    if (n.children) { const r = findNode(n.children, id); if (r) return r; }
  }
  return null;
}
function removeNode(arr, id) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].id === id) { const [x] = arr.splice(i, 1); return x; }
    if (arr[i].children) { const r = removeNode(arr[i].children, id); if (r) return r; }
  }
  return null;
}
function findNavNodeByRoute(arr, r) {
  for (const n of arr) {
    if (n.route === r) return n;
    if (n.children) { const f = findNavNodeByRoute(n.children, r); if (f) return f; }
  }
  return null;
}
function subtreeHasRoute(node, r) {
  if (node.route === r) return true;
  if (node.children) return node.children.some((c) => subtreeHasRoute(c, r));
  return false;
}

/* ---------- 6. 模块 Schema ---------- */
const SEL = (arr) => arr;
const MODULES = {
  tasks: {
    table: 'tasks', title: '日常任务', sub: '高效计划 · 从今天开始',
    fields: [
      { key: 'title', label: '事项', type: 'text', required: true, placeholder: '要做什么？' },
      { key: 'category', label: '分类', type: 'select', options: SEL(['日常', '备课', '教学', '工作', '生活', '其他']) },
      { key: 'priority', label: '优先级', type: 'select', options: SEL(['一般', '重要', '关键']) },
      { key: 'due_date', label: '计划完成', type: 'date' },
      { key: 'tags', label: '标签', type: 'text', placeholder: '多个用空格分隔' },
    ],
    titleOf: (r) => r.title,
    metaOf: (r) => [
      { t: r.category, c: 'gray' },
      { t: r.priority, c: r.priority === '关键' ? 'red' : r.priority === '重要' ? 'amber' : 'gray' },
      { t: r.due_date ? '截止 ' + fmtDate(r.due_date) : '', c: 'blue' },
      { t: r.tags, c: 'gray' },
    ],
  },
  lessons: {
    table: 'lessons', title: '上课记录', sub: '每一堂课都有迹可循',
    fields: [
      { key: 'subject', label: '科目', type: 'text', required: true, placeholder: '如：数学' },
      { key: 'class_name', label: '班级', type: 'text', placeholder: '如：高一(3)班' },
      { key: 'lesson_date', label: '上课日期', type: 'date' },
      { key: 'time_range', label: '时间', type: 'text', placeholder: '如：08:00-08:45' },
      { key: 'location', label: '地点', type: 'text', placeholder: '如：教学楼301' },
      { key: 'status', label: '状态', type: 'select', options: SEL(['待上课', '已完成', '已取消']) },
      { key: 'notes', label: '备注', type: 'textarea' },
    ],
    titleOf: (r) => [r.subject, r.class_name].filter(Boolean).join(' · ') || '未命名课程',
    metaOf: (r) => [
      { t: r.lesson_date ? fmtDate(r.lesson_date) : '', c: 'blue' },
      { t: r.time_range, c: 'gray' },
      { t: r.location, c: 'gray' },
      { t: r.status, c: r.status === '已完成' ? 'green' : r.status === '已取消' ? 'red' : 'amber' },
    ],
  },
  substitutes: {
    table: 'substitutes', title: '代课记录', sub: '代课也要记得清清楚楚',
    fields: [
      { key: 'subject', label: '科目', type: 'text', required: true },
      { key: 'class_name', label: '班级', type: 'text' },
      { key: 'original_teacher', label: '原任课老师', type: 'text' },
      { key: 'lesson_date', label: '代课日期', type: 'date' },
      { key: 'time_range', label: '时间', type: 'text', placeholder: '如：14:00-14:45' },
      { key: 'notes', label: '备注', type: 'textarea' },
    ],
    titleOf: (r) => [r.subject, r.class_name].filter(Boolean).join(' · ') || '未命名代课',
    metaOf: (r) => [
      { t: r.lesson_date ? fmtDate(r.lesson_date) : '', c: 'blue' },
      { t: r.time_range, c: 'gray' },
      { t: r.original_teacher ? '原：' + r.original_teacher : '', c: 'amber' },
    ],
  },
  plans: {
    table: 'lesson_plans', title: '备课', sub: '准备好每一堂课',
    fields: [
      { key: 'title', label: '教案标题', type: 'text', required: true },
      { key: 'subject', label: '科目', type: 'text' },
      { key: 'status', label: '状态', type: 'select', options: SEL(['草稿', '已完成']) },
      { key: 'content', label: '教案内容', type: 'textarea' },
    ],
    titleOf: (r) => r.title,
    metaOf: (r) => [
      { t: r.subject, c: 'gray' },
      { t: r.status, c: r.status === '已完成' ? 'green' : 'amber' },
    ],
  },
  maintenance: {
    table: 'maintenance', title: '维修', sub: '报修跟进，一个不落',
    fields: [
      { key: 'item', label: '报修物品', type: 'text', required: true, placeholder: '如：投影仪' },
      { key: 'location', label: '位置', type: 'text', placeholder: '如：教学楼201' },
      { key: 'priority', label: '优先级', type: 'select', options: SEL(['一般', '紧急']) },
      { key: 'status', label: '状态', type: 'select', options: SEL(['待处理', '处理中', '已完成']) },
      { key: 'report_date', label: '报修日期', type: 'date' },
      { key: 'description', label: '问题描述', type: 'textarea' },
    ],
    titleOf: (r) => r.item || '未命名报修',
    metaOf: (r) => [
      { t: r.location, c: 'gray' },
      { t: r.priority, c: r.priority === '紧急' ? 'red' : 'gray' },
      { t: r.status, c: r.status === '已完成' ? 'green' : r.status === '处理中' ? 'amber' : 'blue' },
      { t: r.report_date ? fmtDate(r.report_date) : '', c: 'gray' },
    ],
  },
  attendance: {
    table: 'attendance_records', title: '考勤', sub: '出勤情况一目了然',
    fields: [
      { key: 'student_name', label: '学生姓名', type: 'text', required: true },
      { key: 'class_name', label: '班级', type: 'text' },
      { key: 'att_date', label: '日期', type: 'date' },
      { key: 'status', label: '状态', type: 'select', options: SEL(['出勤', '缺勤', '迟到', '请假']) },
    ],
    titleOf: (r) => r.student_name || '未知学生',
    metaOf: (r) => [
      { t: r.class_name, c: 'gray' },
      { t: r.att_date ? fmtDate(r.att_date) : '', c: 'blue' },
      { t: r.status, c: r.status === '出勤' ? 'green' : r.status === '缺勤' ? 'red' : r.status === '请假' ? 'amber' : 'blue' },
    ],
  },
  proctoring: {
    table: 'proctoring', title: '监考', sub: '监考安排随时查',
    fields: [
      { key: 'subject', label: '考试科目', type: 'text', required: true },
      { key: 'location', label: '考场', type: 'text', placeholder: '如：第一考场' },
      { key: 'exam_date', label: '日期', type: 'date' },
      { key: 'time_range', label: '时间', type: 'text', placeholder: '如：09:00-11:00' },
      { key: 'notes', label: '备注', type: 'textarea' },
    ],
    titleOf: (r) => [r.subject, r.location].filter(Boolean).join(' · ') || '未命名监考',
    metaOf: (r) => [
      { t: r.exam_date ? fmtDate(r.exam_date) : '', c: 'blue' },
      { t: r.time_range, c: 'gray' },
    ],
  },
  trips: {
    table: 'trips', title: '出差', sub: '行程安排清晰可见',
    fields: [
      { key: 'destination', label: '目的地', type: 'text', required: true },
      { key: 'start_date', label: '出发日期', type: 'date' },
      { key: 'end_date', label: '返回日期', type: 'date' },
      { key: 'status', label: '状态', type: 'select', options: SEL(['待出发', '进行中', '已结束']) },
      { key: 'purpose', label: '出差事由', type: 'textarea' },
    ],
    titleOf: (r) => r.destination || '未命名行程',
    metaOf: (r) => [
      { t: [fmtDate(r.start_date), fmtDate(r.end_date)].filter(Boolean).join(' ~ '), c: 'blue' },
      { t: r.status, c: r.status === '进行中' ? 'amber' : r.status === '已结束' ? 'gray' : 'green' },
    ],
  },
  study: {
    table: 'study_notes', title: '学习', sub: '学习笔记，沉淀成长',
    fields: [
      { key: 'title', label: '笔记标题', type: 'text', required: true },
      { key: 'category', label: '分类', type: 'select', options: SEL(['教学法', '学科知识', '班级管理', '技术', '其他']) },
      { key: 'content', label: '内容', type: 'textarea' },
    ],
    titleOf: (r) => r.title,
    metaOf: (r) => [{ t: r.category, c: 'blue' }],
  },
  students: {
    table: 'students', title: '学生名单', sub: '小课堂的学生都在这里',
    fields: [
      { key: 'name', label: '姓名', type: 'text', required: true },
      { key: 'nickname', label: '昵称', type: 'text' },
      { key: 'note', label: '备注', type: 'textarea' },
    ],
    titleOf: (r) => r.name,
    metaOf: (r) => [{ t: r.nickname, c: 'gray' }, { t: r.note, c: 'gray' }],
  },
  homework: {
    table: 'homework', title: '作业', sub: '布置与跟踪作业',
    fields: [
      { key: 'title', label: '作业标题', type: 'text', required: true },
      { key: 'class_name', label: '班级', type: 'text' },
      { key: 'due_date', label: '截止日期', type: 'date' },
      { key: 'description', label: '作业说明', type: 'textarea' },
    ],
    titleOf: (r) => r.title,
    metaOf: (r) => [
      { t: r.class_name, c: 'gray' },
      { t: r.due_date ? '截止 ' + fmtDate(r.due_date) : '', c: 'blue' },
    ],
  },
  messages: {
    table: 'messages', title: '留言', sub: '学生与家长的留言',
    fields: [
      { key: 'content', label: '留言内容', type: 'textarea', required: true },
      { key: 'author_name', label: '留言人', type: 'text' },
    ],
    titleOf: (r) => r.content,
    metaOf: (r) => [{ t: r.author_name, c: 'blue' }],
  },
  blindbox: {
    table: 'blindbox_items', title: '盲盒', sub: '小课堂奖励盲盒配置',
    fields: [
      { key: 'label', label: '奖品名称', type: 'text', required: true },
      { key: 'item_type', label: '类型', type: 'select', options: SEL(['实物', '积分', '称号', '空']) },
      { key: 'quantity', label: '数量', type: 'number' },
    ],
    titleOf: (r) => r.label,
    metaOf: (r) => [
      { t: r.item_type, c: 'blue' },
      { t: r.quantity != null ? '数量 ' + r.quantity : '', c: 'gray' },
    ],
  },
};

/* ---------- 7. 数据层 ---------- */
const db = {
  async list(table) {
    const { data, error } = await cloud.database.from(table).select('*')
      .is('deleted_at', null).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async insert(table, row) {
    const { data, error } = await cloud.database.from(table).insert(row).select();
    if (error) throw error;
    return data?.[0];
  },
  async update(table, id, row) {
    const { data, error } = await cloud.database.from(table).update(row).eq('id', id).select();
    if (error) throw error;
    return data?.[0];
  },
  async softDelete(table, id) {
    const { error } = await cloud.database.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },
  async restore(table, id) {
    const { error } = await cloud.database.from(table).update({ deleted_at: null }).eq('id', id);
    if (error) throw error;
  },
  async purge(table, id) {
    const { error } = await cloud.database.from(table).delete().eq('id', id);
    if (error) throw error;
  },
  async listTrash(table) {
    const { data, error } = await cloud.database.from(table).select('*')
      .not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async toggleTask(id, done) {
    const { error } = await cloud.database.from('tasks')
      .update({ done, done_at: done ? new Date().toISOString() : null }).eq('id', id);
    if (error) throw error;
  },
};

/* ---------- 8. 认证 ---------- */
let currentUser = null;
let pendingOtp = null;
let codeTimer = null;

function showLogin() { $('#login-view').hidden = false; $('#app-view').hidden = true; }
function showApp() { $('#login-view').hidden = true; $('#app-view').hidden = false; }

async function restoreAuth() {
  const url = new URL(location.href);
  if (url.searchParams.has('code') || url.searchParams.has('error')) {
    const provider = url.searchParams.get('provider');
    if (provider === 'workbuddy' || provider === 'wechat') {
      const handle = provider === 'workbuddy'
        ? cloud.auth.handleWorkBuddyCallback
        : cloud.auth.handleWechatWebCallback;
      if (typeof handle === 'function') {
        const { data: session, error } = await handle.call(cloud.auth);
        if (error) { showLogin(); toast(error.message, 'error'); return; }
        if (session) {
          for (const k of ['code', 'state', 'provider']) url.searchParams.delete(k);
          history.replaceState(null, '', url.pathname + url.search + url.hash);
          currentUser = session.user;
          showApp();
          afterLogin();
          return;
        }
      } else {
        showLogin(); toast('暂时无法使用此方式登录', 'error'); return;
      }
    } else {
      showLogin(); toast('授权回调缺少有效登录方式，请重新登录', 'error'); return;
    }
  }

  const { data: session, error } = await cloud.auth.getSession();
  if (error || !session) { showLogin(); return; }
  currentUser = session.user;
  showApp();
  afterLogin();
}

async function afterLogin() {
  await loadConfig();
  await seedSystemIcons();
  renderBrand();
  renderNav();
  renderMobileNav();
  route();
  startClock();
  bindSearch();
}

async function sendPhoneCode() {
  const phone = $('#phone-input').value.trim();
  $('#phone-error').textContent = '';
  if (!/^1\d{10}$/.test(phone)) { $('#phone-error').textContent = '请输入正确的 11 位手机号'; return; }
  const btn = $('#send-code-btn');
  btn.disabled = true;
  const sent = await cloud.auth.sendOtp({ phone });
  if (sent.error) { btn.disabled = false; $('#login-error').textContent = sent.error.message; return; }
  pendingOtp = { phone, verificationId: sent.data.verificationId, isExistingUser: sent.data.isExistingUser };
  $('#login-error').textContent = '';
  toast('验证码已发送');
  let n = 60;
  btn.textContent = n + 's 后重发';
  codeTimer = setInterval(() => {
    n--;
    if (n <= 0) { clearInterval(codeTimer); btn.disabled = false; btn.textContent = '获取验证码'; }
    else { btn.textContent = n + 's 后重发'; }
  }, 1000);
}

async function submitPhoneLogin() {
  const phone = $('#phone-input').value.trim();
  const code = $('#code-input').value.trim();
  $('#login-error').textContent = '';
  if (!pendingOtp || pendingOtp.phone !== phone) { $('#login-error').textContent = '请先获取当前手机号的验证码'; return; }
  if (!/^\d{6}$/.test(code)) { $('#login-error').textContent = '请输入 6 位验证码'; return; }
  const btn = $('#phone-login-btn');
  btn.disabled = true; btn.textContent = '登录中…';
  const done = await cloud.auth.verifyOtp({
    phone: pendingOtp.phone,
    verificationId: pendingOtp.verificationId,
    isExistingUser: pendingOtp.isExistingUser,
    token: code,
  });
  if (done.error) { btn.disabled = false; btn.textContent = '登录 / 注册'; $('#login-error').textContent = done.error.message; return; }
  pendingOtp = null;
  currentUser = done.data.user;
  showApp();
  afterLogin();
}

async function oauthLogin(provider) {
  const back = new URL(location.href);
  back.pathname = '/';
  for (const k of ['code', 'state', 'provider']) back.searchParams.delete(k);
  const { data, error } = await cloud.auth.signInWithOAuth({ provider, redirectTo: back.toString() });
  if (error) { toast(error.message, 'error'); return; }
  location.assign(data.url);
}

async function signOut() {
  await cloud.auth.signOut();
  currentUser = null;
  pendingOtp = null;
  showLogin();
}

/* ---------- 9. 路由 ---------- */
let currentRoute = 'home';

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  return h.split('/').filter(Boolean)[0] || 'home';
}

function route() {
  const r = parseHash();
  if (!findNavNodeByRoute(userConfig.nav, r) && r !== 'home') { location.hash = '#/home'; return; }
  currentRoute = r;
  const parent = userConfig.nav.find((n) => n.children && subtreeHasRoute(n, r));
  if (parent && parent.id === 'work') navOpen['work'] = true;
  renderNav();
  renderMobileNav();
  renderContent();
  closeSidebar();
  window.scrollTo(0, 0);
}

function navigate(routeKey) { location.hash = '#/' + routeKey; }

function navigateById(id) {
  const f = findNode(userConfig.nav, id);
  if (!f) return;
  const node = f.node;
  if (node.children && node.children.length) navigate(node.children[0].route);
  else if (node.route) navigate(node.route);
}

/* ---------- 10. 导航渲染 ---------- */
async function getTaskPending() {
  try {
    const rows = await db.list('tasks');
    return rows.filter((r) => !r.done).length;
  } catch { return 0; }
}

function renderBrand() {
  const b = userConfig.brand;
  const el = $('.side-brand');
  if (!el) return;
  const avatar = (b.icon && b.icon.startsWith('data:'))
    ? '<img class="brand-avatar-img" src="' + b.icon + '" alt="">'
    : '<div class="brand-avatar">' + escapeHtml(b.icon || '龙') + '</div>';
  el.innerHTML = avatar + '<div class="brand-text"><div class="brand-title">' + escapeHtml(b.title || '') +
    '</div><div class="brand-sub">' + escapeHtml(b.subtitle || '') + '</div></div>';
}

function isActiveTop(item) {
  if (item.route === currentRoute) return true;
  if (item.children) return item.children.some((c) => c.route === currentRoute);
  return false;
}

async function renderNav() {
  const nav = $('#side-nav');
  const footer = $('#side-footer-nav');
  if (!nav) return;
  const pending = currentUser ? await getTaskPending() : 0;
  userConfig.nav.forEach((n) => {
    if (n.children && navOpen[n.id] === undefined) navOpen[n.id] = subtreeHasRoute(n, currentRoute);
  });

  const top = userConfig.nav.filter((n) => !n.pinned);
  const pinned = userConfig.nav.find((n) => n.pinned);

  nav.innerHTML = top.map((item) => navItemHTML(item, pending)).join('');
  footer.innerHTML = pinned ? navItemHTML(pinned, pending) : '';

  $$('#side-nav .nav-item, #side-footer-nav .nav-item').forEach((btn) => {
    btn.onclick = () => {
      const key = btn.dataset.nav;
      const sub = btn.dataset.sub;
      if (btn.dataset.hasSub === '1' && !sub) {
        navOpen[key] = !navOpen[key];
        if (key === 'work') { userConfig.workCollapsed = !navOpen[key]; saveConfig().catch(() => {}); }
        renderNav();
        return;
      }
      if (sub) navigate(sub);
      else if (btn.dataset.route) navigate(btn.dataset.route);
    };
  });
}

function navItemHTML(item, pending) {
  const hasChildren = item.children && item.children.length;
  const isOpen = !!navOpen[item.id];
  const active = isActiveTop(item);
  const badge = item.badge === 'taskPending' && pending > 0
    ? '<span class="nav-badge danger">' + pending + '</span>' : '';
  const chev = hasChildren ? '<span class="nav-chev">›</span>' : '';
  let html = '<button class="nav-item ' + (active && !hasChildren ? 'active' : '') + ' ' + (isOpen && hasChildren ? 'open' : '') +
    '" data-nav="' + item.id + '" data-route="' + (item.route || '') + '" data-has-sub="' + (hasChildren ? 1 : 0) + '">' +
    '<span class="nav-ic">' + iconHTML(item.icon, 18) + '</span>' +
    '<span class="nav-label">' + escapeHtml(item.label) + '</span>' + badge + chev + '</button>';
  if (hasChildren) {
    html += '<div class="sub-nav" style="' + (isOpen ? '' : 'display:none') + '">' +
      item.children.map((c) =>
        '<button class="nav-item ' + (c.route === currentRoute ? 'active' : '') + '" data-nav="' + item.id + '" data-sub="' + c.id + '" data-route="' + (c.route || '') + '">' +
        '<span class="nav-ic">' + iconHTML(c.icon, 16) + '</span>' +
        '<span class="nav-label">' + escapeHtml(c.label) + '</span></button>').join('') + '</div>';
  }
  return html;
}

function renderMobileNav() {
  const want = ['home', 'tasks', 'work', 'classroom', 'profile'];
  const map = {};
  userConfig.nav.forEach((n) => { map[n.id] = n; });
  const items = want.filter((id) => map[id]);
  $('#mobile-nav').innerHTML = items.map((id) => {
    const n = map[id];
    const active = n.route === currentRoute || (n.children && n.children.some((c) => c.route === currentRoute));
    return '<button class="m-nav-item ' + (active ? 'active' : '') + '" data-mnav="' + id + '">' +
      '<span class="m-ic">' + iconHTML(n.icon, 20) + '</span>' + escapeHtml(n.label) + '</button>';
  }).join('');
  $$('#mobile-nav .m-nav-item').forEach((b) => { b.onclick = () => navigateById(b.dataset.mnav); });
}

function closeSidebar() { const sb = $('#sidebar'); if (sb) sb.classList.remove('open'); }

/* ---------- 11. 内容渲染 ---------- */
const PAGE_RENDERERS = {
  home: renderHome,
  tasks: () => renderListModule('tasks'),
  lessons: () => renderListModule('lessons'),
  schedule: renderSchedule,
  plans: () => renderListModule('plans'),
  maintenance: () => renderListModule('maintenance'),
  attendance: () => renderListModule('attendance'),
  proctoring: () => renderListModule('proctoring'),
  trips: () => renderListModule('trips'),
  substitutes: () => renderListModule('substitutes'),
  study: () => renderListModule('study'),
  students: () => renderListModule('students'),
  homework: () => renderListModule('homework'),
  messages: () => renderListModule('messages'),
  blindbox: () => renderListModule('blindbox'),
  classroom: renderClassroomHub,
  trash: renderTrash,
  profile: renderProfile,
};

async function renderContent() {
  const c = $('#content');
  const fn = PAGE_RENDERERS[currentRoute] || renderHome;
  c.innerHTML = '<div class="empty"><span class="empty-ic">⏳</span>加载中…</div>';
  try { await fn(); }
  catch (e) {
    console.error(e);
    c.innerHTML = '<div class="empty"><span class="empty-ic">⚠️</span>加载失败，请重试<br><small>' + escapeHtml(e.message || '') + '</small></div>';
  }
}

/* ---------- 12. 通用列表模块 ---------- */
function pageHead(m, extra = '') {
  return '<div class="page-head"><div><div class="page-title">' + m.title + '</div>' +
    '<div class="page-sub">' + (m.sub || '') + '</div></div><span class="spacer"></span>' + extra +
    '<button class="btn btn-primary" data-add>＋ 新建</button></div>';
}

async function renderListModule(key) {
  const m = MODULES[key];
  const c = $('#content');
  const rows = await db.list(m.table);
  const searchTabs = key === 'tasks' ? '<div class="filter-tabs">' +
    '<button class="filter-tab active" data-filter="all">全部 ' + rows.length + '</button>' +
    '<button class="filter-tab" data-filter="pending">待完成 ' + rows.filter((r) => !r.done).length + '</button>' +
    '<button class="filter-tab" data-filter="done">已完成 ' + rows.filter((r) => r.done).length + '</button></div>' : '';
  c.innerHTML = pageHead(m) + searchTabs + renderRows(m, rows);
  bindListActions(key, m, rows);
}

function renderRows(m, rows) {
  if (!rows.length) {
    return '<div class="empty"><span class="empty-ic">🗂️</span>暂无数据，点击「＋ 新建」开始记录吧</div>';
  }
  return '<div class="list">' + rows.map((r) => {
    const done = r.done === true;
    const title = m.titleOf(r);
    const metas = m.metaOf(r).filter((x) => x.t).map((x) => '<span class="tag tag-' + x.c + '">' + escapeHtml(x.t) + '</span>').join('');
    return '<div class="list-row" data-id="' + r.id + '">' +
      (m.table === 'tasks' ? '<button class="icon-btn" data-toggle title="标记完成" style="color:' + (done ? 'var(--ok)' : 'var(--muted-2)') + '">' + (done ? '✅' : '⬜') + '</button>' : '') +
      '<div class="row-main"><div class="row-title ' + (done ? 'done' : '') + '">' + escapeHtml(title) + '</div>' +
      '<div class="row-meta">' + metas + '</div></div>' +
      '<div class="row-actions"><button class="icon-btn" data-edit title="编辑">✏️</button>' +
      '<button class="icon-btn" data-del title="删除">🗑️</button></div></div>';
  }).join('') + '</div>';
}

function bindListActions(key, m, rows) {
  const c = $('#content');
  c.querySelector('[data-add]').onclick = () => openForm(m);
  c.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.closest('.list-row').dataset.id;
      const row = rows.find((r) => String(r.id) === id);
      if (row) openForm(m, row);
    };
  });
  c.querySelectorAll('[data-del]').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.closest('.list-row').dataset.id;
      if (await confirmDialog('确定删除这条记录吗？可在回收站中恢复。')) {
        try { await db.softDelete(m.table, id); toast('已移入回收站', 'success'); renderContent(); }
        catch (e) { toast(e.message || '删除失败', 'error'); }
      }
    };
  });
  c.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.closest('.list-row').dataset.id;
      const row = rows.find((r) => String(r.id) === id);
      try { await db.toggleTask(id, !row.done); renderContent(); }
      catch (e) { toast(e.message || '操作失败', 'error'); }
    };
  });
  c.querySelectorAll('[data-filter]').forEach((tab) => {
    tab.onclick = () => {
      c.querySelectorAll('[data-filter]').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const f = tab.dataset.filter;
      const filtered = f === 'all' ? rows : f === 'pending' ? rows.filter((r) => !r.done) : rows.filter((r) => r.done);
      const list = c.querySelector('.list');
      const newList = renderRows(m, filtered);
      if (list) list.outerHTML = newList; else c.insertAdjacentHTML('beforeend', newList);
      bindListActions(key, m, rows);
    };
  });
}

function openForm(m, row = null) {
  const values = row || {};
  const fieldsHtml = m.fields.map((f) => {
    const val = values[f.key] ?? '';
    const req = f.required ? 'required' : '';
    if (f.type === 'textarea') {
      return '<div class="form-field"><label>' + f.label + (f.required ? ' *' : '') + '</label><textarea data-k="' + f.key + '">' + escapeHtml(val) + '</textarea></div>';
    }
    if (f.type === 'select') {
      return '<div class="form-field"><label>' + f.label + '</label><select data-k="' + f.key + '">' +
        f.options.map((o) => '<option ' + (val === o ? 'selected' : '') + '>' + o + '</option>').join('') + '</select></div>';
    }
    const type = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text';
    return '<div class="form-field"><label>' + f.label + (f.required ? ' *' : '') + '</label>' +
      '<input data-k="' + f.key + '" type="' + type + '" value="' + escapeHtml(val) + '" placeholder="' + escapeHtml(f.placeholder || '') + '" ' + req + '></div>';
  }).join('');

  openModal('<div class="modal-title">' + (row ? '编辑' : '新建') + m.title.replace('日常任务', '事项') + '</div>' +
    fieldsHtml + '<div class="modal-actions">' +
    (row ? '<button class="btn btn-danger" id="form-del" style="margin-right:auto">删除</button>' : '') +
    '<button class="btn btn-ghost" data-close>取消</button><button class="btn btn-primary" id="form-save">保存</button></div>');

  bindClose();

  const delBtn = $('#form-del');
  if (delBtn) {
    delBtn.onclick = async () => {
      if (await confirmDialog('确定删除这条记录吗？可在回收站中恢复。')) {
        try { await db.softDelete(m.table, row.id); closeModal(); toast('已移入回收站', 'success'); renderContent(); }
        catch (e) { toast(e.message || '删除失败', 'error'); }
      }
    };
  }

  $('#form-save').onclick = async () => {
    const data = {};
    for (const f of m.fields) {
      const el = $('#modal-panel [data-k="' + f.key + '"]');
      if (!el) continue;
      let v = f.type === 'textarea' ? el.value : el.value.trim();
      if (f.required && !v) { toast(f.label + ' 不能为空', 'error'); return; }
      if (f.type === 'number') v = v === '' ? null : Number(v);
      if ((f.type === 'date') && !v) v = null;
      data[f.key] = v;
    }
    try {
      if (row) { await db.update(m.table, row.id, data); toast('已更新', 'success'); }
      else { await db.insert(m.table, data); toast('已创建', 'success'); }
      closeModal();
      renderContent();
    } catch (e) { toast(e.message || '保存失败', 'error'); }
  };
}

/* ---------- 13. 首页 ---------- */
async function renderHome() {
  const c = $('#content');
  const name = currentUser?.name || currentUser?.phone || '老师';
  const [tasks, lessons] = await Promise.all([db.list('tasks'), db.list('lessons')]);
  const pending = tasks.filter((r) => !r.done);
  const today = todayStr();
  const todayLessons = lessons.filter((r) => r.lesson_date === today);
  const todayTasks = tasks.filter((r) => r.due_date === today);

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];

  c.innerHTML =
    '<div class="home-grid">' +
      '<div class="welcome-banner"><h2>' + greeting() + '，' + escapeHtml(name) + '</h2>' +
      '<div class="w-sub">状态在线，效率翻倍！</div>' +
      '<div class="welcome-clock" id="clock">' + hh + ':' + mm + '<span style="font-size:20px">:' + ss + '</span></div>' +
      '<div class="welcome-date">' + now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日 · 周' + week + '</div>' +
      '<div class="welcome-countdown">⏱ 今日剩余 <b id="countdown">--:--:--</b></div></div>' +
      '<div class="card"><div class="card-head"><span class="card-title">📍 今日天气</span></div>' +
      '<div class="weather-temp">17°</div><div style="color:var(--ink-2);font-size:13px">阴 · 14° ~ 18°</div>' +
      '<div style="color:var(--muted);font-size:12px;margin-top:4px">空气优 · 湿度 95% · 体感 18° <span class="tag tag-gray">示例</span></div>' +
      '<div class="weather-forecast">' +
      ['今天 18/14', '周日 18/12', '周一 18/11', '周二 15/11', '周三 20/11', '周四 16/11', '周五 13/10']
        .map((d) => '<div class="weather-day"><b>' + d.split(' ')[0] + '</b>' + d.split(' ')[1] + '</div>').join('') +
      '</div></div></div>' +
    '<div class="home-row">' +
      '<div class="card"><div class="card-head"><span class="card-title">✅ 今日事项</span><span class="tag tag-red">' + pending.length + ' 待完成</span></div>' +
      (todayTasks.length
        ? '<div class="list">' + todayTasks.map((t) => '<div class="list-row" style="padding:10px 12px"><div class="row-main"><div class="row-title ' + (t.done ? 'done' : '') + '">' + escapeHtml(t.title) + '</div><div class="row-meta"><span class="tag tag-gray">' + escapeHtml(t.category || '日常') + '</span></div></div><span class="tag ' + (t.done ? 'tag-green' : 'tag-amber') + '">' + (t.done ? '已完成' : '待完成') + '</span></div>').join('') + '</div>'
        : '<div class="empty"><span class="empty-ic">🌤️</span>今天没有待办事项，轻松一下</div>') + '</div>' +
      '<div class="card"><div class="card-head"><span class="card-title">🛎️ 今日上课提醒</span><span class="tag tag-gray">' + todayLessons.length + ' 节</span></div>' +
      (todayLessons.length
        ? '<div class="list">' + todayLessons.map((l) => '<div class="list-row" style="padding:10px 12px"><div class="row-main"><div class="row-title">' + escapeHtml(l.subject || '未命名') + ' · ' + escapeHtml(l.class_name || '') + '</div><div class="row-meta"><span class="tag tag-blue">' + escapeHtml(l.time_range || '') + '</span><span class="tag tag-gray">' + escapeHtml(l.location || '') + '</span></div></div></div>').join('') + '</div>'
        : '<div class="empty"><span class="empty-ic">📅</span>今天没有课，轻松一下</div>') + '</div>' +
      '<div class="card"><div id="home-cal"></div></div>' +
    '</div>';

  renderCalendar('home-cal', new Date(), lessons, tasks);
  startClock();
}

function renderCalendar(elId, baseDate, lessons, tasks) {
  const el = document.getElementById(elId);
  const y = baseDate.getFullYear(), m = baseDate.getMonth();
  const first = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const eventDays = new Set();
  lessons.forEach((l) => { if (l.lesson_date) eventDays.add(l.lesson_date); });
  tasks.forEach((t) => { if (t.due_date) eventDays.add(t.due_date); });

  let html = '<div class="cal-head"><span class="cal-month">' + y + '年' + (m + 1) + '月</span>' +
    '<span class="cal-nav"><button class="icon-btn" data-cal="-1">‹</button><button class="icon-btn" data-cal="1">›</button></span></div>';
  html += '<div class="cal-grid">' + ['日', '一', '二', '三', '四', '五', '六'].map((d) => '<div class="cal-dow">' + d + '</div>').join('');
  for (let i = 0; i < first; i++) html += '<div class="cal-day other"></div>';
  const today = todayStr();
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const cls = ['cal-day'];
    if (ds === today) cls.push('today');
    if (eventDays.has(ds)) cls.push('has-event');
    html += '<div class="' + cls.join(' ') + '">' + d + '</div>';
  }
  html += '</div>';
  html += '<div style="display:flex;gap:14px;margin-top:10px;font-size:11px;color:var(--muted)"><span>● 有课程</span><span style="color:var(--warn)">● 有事项</span><span>◯ 今天</span></div>';
  el.innerHTML = html;

  el.querySelectorAll('[data-cal]').forEach((btn) => {
    btn.onclick = () => renderCalendar(elId, new Date(y, m + Number(btn.dataset.cal), 1), lessons, tasks);
  });
}

function startClock() {
  const clockEl = $('#clock');
  const cdEl = $('#countdown');
  if (!clockEl && !cdEl) return;
  const tick = () => {
    const n = new Date();
    if (clockEl) {
      clockEl.innerHTML = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0') +
        '<span style="font-size:20px">:' + String(n.getSeconds()).padStart(2, '0') + '</span>';
    }
    if (cdEl) {
      const rest = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n;
      const h = Math.floor(rest / 3600000), mi = Math.floor(rest % 3600000 / 60000), s = Math.floor(rest % 60000 / 1000);
      cdEl.textContent = String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
  };
  tick();
  setInterval(tick, 1000);
}

/* ---------- 14. 课表 ---------- */
const SCHEDULE_MODULE = {
  table: 'schedule_items', title: '课表', sub: '每周课程安排',
  fields: [
    { key: 'day_of_week', label: '星期', type: 'select', options: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] },
    { key: 'period', label: '第几节', type: 'number' },
    { key: 'subject', label: '科目', type: 'text', required: true },
    { key: 'class_name', label: '班级', type: 'text' },
    { key: 'location', label: '地点', type: 'text' },
  ],
  titleOf: (r) => r.subject || '未命名课程',
  metaOf: () => [],
};

async function renderSchedule() {
  const c = $('#content');
  const rows = await db.list('schedule_items');
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  c.innerHTML = pageHead(SCHEDULE_MODULE);
  const grid = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin-top:6px">' +
    days.map((d, i) =>
      '<div class="card" style="padding:12px"><div style="font-weight:700;margin-bottom:10px;color:var(--ink)">' + d + '</div>' +
      rows.filter((r) => r.day_of_week === i + 1).sort((a, b) => (a.period || 0) - (b.period || 0)).map((r) =>
        '<div style="background:var(--primary-soft);border-radius:9px;padding:8px 10px;margin-bottom:8px;position:relative;cursor:pointer" data-sid="' + r.id + '">' +
        '<div style="font-weight:600;font-size:13px">' + escapeHtml(r.subject || '') + '</div>' +
        '<div style="font-size:11px;color:var(--muted);margin-top:2px">' + escapeHtml(r.class_name || '') + (r.location ? ' · ' + escapeHtml(r.location) : '') + '</div></div>').join('') ||
        '<div style="color:var(--muted-2);font-size:12px;text-align:center;padding:8px">—</div>' + '</div>').join('') + '</div>';
  c.insertAdjacentHTML('beforeend', grid);
  c.querySelector('[data-add]').onclick = () => openForm(SCHEDULE_MODULE);
  c.querySelectorAll('[data-sid]').forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.sid;
      const row = rows.find((r) => String(r.id) === id);
      if (row) openForm(SCHEDULE_MODULE, row);
    };
  });
}

/* ---------- 15. 回收站 ---------- */
async function renderTrash() {
  const c = $('#content');
  c.innerHTML = '<div class="page-head"><div><div class="page-title">回收站</div><div class="page-sub">删除的记录会保留在这里，可恢复或彻底删除</div></div></div><div class="empty"><span class="empty-ic">⏳</span>加载中…</div>';

  const tables = Object.values(MODULES).map((m) => m.table);
  const results = await Promise.all(tables.map(async (t) => ({ t, rows: await db.listTrash(t) })));
  const all = results.filter((r) => r.rows.length);
  const titleMap = {};
  Object.entries(MODULES).forEach(([k, m]) => { titleMap[m.table] = { key: k, title: m.title, titleOf: m.titleOf }; });

  if (!all.length) {
    c.innerHTML = '<div class="page-head"><div><div class="page-title">回收站</div><div class="page-sub">删除的记录会保留在这里，可恢复或彻底删除</div></div></div><div class="empty"><span class="empty-ic">🗑️</span>回收站是空的</div>';
    return;
  }

  let html = '<div class="page-head"><div><div class="page-title">回收站</div><div class="page-sub">删除的记录会保留在这里，可恢复或彻底删除</div></div></div>';
  for (const { t, rows } of all) {
    const info = titleMap[t];
    html += '<div class="card" style="margin-bottom:16px"><div class="card-head"><span class="card-title">' + info.title + '</span><span class="tag tag-gray">' + rows.length + ' 条</span></div><div class="list">' +
      rows.map((r) => '<div class="list-row" data-table="' + t + '" data-id="' + r.id + '"><div class="row-main"><div class="row-title">' + escapeHtml(info.titleOf(r) || '未命名') + '</div><div class="row-meta"><span class="tag tag-gray">删除于 ' + (r.deleted_at ? new Date(r.deleted_at).toLocaleString('zh-CN') : '') + '</span></div></div><div class="row-actions"><button class="btn btn-sm btn-ghost" data-restore>恢复</button><button class="btn btn-sm btn-danger" data-purge>彻底删除</button></div></div>').join('') + '</div></div>';
  }
  c.innerHTML = html;

  c.querySelectorAll('[data-restore]').forEach((btn) => {
    btn.onclick = async () => {
      const row = btn.closest('.list-row');
      try { await db.restore(row.dataset.table, row.dataset.id); toast('已恢复', 'success'); renderContent(); }
      catch (e) { toast(e.message || '恢复失败', 'error'); }
    };
  });
  c.querySelectorAll('[data-purge]').forEach((btn) => {
    btn.onclick = async () => {
      const row = btn.closest('.list-row');
      if (await confirmDialog('彻底删除后不可恢复，确定吗？')) {
        try { await db.purge(row.dataset.table, row.dataset.id); toast('已彻底删除', 'success'); renderContent(); }
        catch (e) { toast(e.message || '删除失败', 'error'); }
      }
    };
  });
}

/* ---------- 16. 小课堂聚合页 ---------- */
function renderClassroomHub() {
  const c = $('#content');
  const cards = [['students', '学生名单', '👥'], ['homework', '作业', '📝'], ['messages', '留言', '💬'], ['blindbox', '盲盒', '🎁']];
  c.innerHTML = '<div class="page-head"><div><div class="page-title">小课堂</div><div class="page-sub">课堂管理一站式入口</div></div></div>' +
    '<div class="card-grid">' + cards.map(([k, l, ic]) =>
      '<div class="hub-card" data-go="' + k + '"><span class="hub-ic">' + ic + '</span><div class="hub-label">' + l + '</div><span class="hub-arrow">›</span></div>').join('') + '</div>';
  c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => navigate(b.dataset.go); });
}

/* ---------- 17. 我的 / 首页设置 ---------- */
function renderProfile() {
  const c = $('#content');
  const name = currentUser?.name || '老师';
  const phone = currentUser?.phone ? String(currentUser.phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '未绑定';
  c.innerHTML =
    '<div class="page-head"><div><div class="page-title">我的</div><div class="page-sub">个性化设置与账号</div></div></div>' +
    '<div class="card" style="max-width:640px">' +
      '<div class="settings-group-title">首页设置</div>' +
      '<button class="settings-row" id="open-workbench-settings">' +
        '<span class="settings-ic">' + iconHTML(userConfig.brand.icon, 22) + '</span>' +
        '<span class="settings-main"><b>工作台设置</b><small>图标、标题、副标题</small></span>' +
        '<span class="settings-arrow">›</span></button>' +
      '<button class="settings-row" id="open-nav-settings">' +
        '<span class="settings-ic">🧭</span>' +
        '<span class="settings-main"><b>导航设置</b><small>改名、换图标、拖动排序</small></span>' +
        '<span class="settings-arrow">›</span></button>' +
    '</div>' +
    '<div class="card" style="max-width:640px;margin-top:16px">' +
      '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">' +
        '<div class="mini-avatar" style="width:56px;height:56px;font-size:24px">' + escapeHtml((name || '师').slice(0, 1)) + '</div>' +
        '<div><div style="font-size:18px;font-weight:800">' + escapeHtml(name) + '</div>' +
        '<div style="color:var(--muted);font-size:13px">' + escapeHtml(phone) + '</div></div></div>' +
      '<div style="border-top:1px solid var(--line);padding-top:16px">' +
        '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)"><span style="color:var(--muted)">应用名称</span><span>阿龙教师工作台</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)"><span style="color:var(--muted)">数据存储</span><span>WorkBuddy 云服务</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:10px 0"><span style="color:var(--muted)">账号类型</span><span class="tag tag-blue">教师</span></div></div>' +
      '<button class="btn btn-danger" style="margin-top:20px;width:100%;justify-content:center" id="logout-btn">退出登录</button>' +
    '</div>';

  $('#open-workbench-settings').onclick = openWorkbenchSettings;
  $('#open-nav-settings').onclick = openNavSettings;
  $('#logout-btn').onclick = signOut;
}

/* ---------- 18. 工作台设置（图标/标题/副标题 + 裁剪） ---------- */
function openWorkbenchSettings() {
  const b = Object.assign({}, userConfig.brand);
  openModal(
    '<div class="modal-title">工作台设置</div>' +
    '<div class="form-field"><label>主图标</label><div class="icon-edit-row">' +
      '<div class="icon-preview" id="wb-icon-preview">' + iconHTML(b.icon, 48) + '</div>' +
      '<div><button class="btn btn-sm" id="wb-pick-icon">选择图标</button> ' +
      '<button class="btn btn-sm btn-ghost" id="wb-upload-icon">上传并裁剪</button></div></div></div>' +
    '<div class="form-field"><label>标题</label><input id="wb-title" value="' + escapeHtml(b.title) + '"></div>' +
    '<div class="form-field"><label>副标题</label><input id="wb-sub" value="' + escapeHtml(b.subtitle) + '"></div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" data-close>取消</button>' +
    '<button class="btn btn-primary" id="wb-save">保存</button></div>');
  bindClose();
  $('#wb-pick-icon').onclick = () => openIconPicker((val) => { b.icon = val; $('#wb-icon-preview').innerHTML = iconHTML(val, 48); });
  $('#wb-upload-icon').onclick = () => openImageCropper((dataUrl) => { b.icon = dataUrl; $('#wb-icon-preview').innerHTML = iconHTML(dataUrl, 48); });
  $('#wb-save').onclick = async () => {
    b.title = $('#wb-title').value.trim() || b.title;
    b.subtitle = $('#wb-sub').value.trim();
    userConfig.brand = b;
    try { await saveConfig(); closeModal(); renderBrand(); toast('已保存', 'success'); }
    catch (e) { toast(e.message || '保存失败', 'error'); }
  };
}

/* ---------- 19. 图标选择器（系统 SVG + 公共上传 + 表情） ---------- */
let pickerCallback = null;

async function openIconPicker(cb) {
  pickerCallback = cb;
  const icons = await loadIconLibrary();
  const sys = icons.filter((i) => i.kind === 'system');
  const up = icons.filter((i) => i.kind === 'upload');
  const sysCells = sys.map((i) => '<button class="ip-cell" data-val="' + escapeHtml(i.data) + '">' + iconHTML(i.data, 22) + '</button>').join('');
  const upCells = up.length
    ? up.map((i) => '<button class="ip-cell" data-val="' + escapeHtml(i.data) + '">' + iconHTML(i.data, 22) + '</button>').join('')
    : '<span class="ip-empty">暂无，可点击下方上传</span>';
  const emoCells = EMOJI_CHOICES.map((e) => '<button class="ip-cell" data-val="' + e + '">' + iconHTML(e, 22) + '</button>').join('');

  openModal(
    '<div class="modal-title">选择图标</div>' +
    '<div class="icon-picker">' +
      '<div class="ip-section-title">系统图标</div><div class="ip-grid">' + sysCells + '</div>' +
      '<div class="ip-section-title">公共上传（所有教师可选）</div><div class="ip-grid">' + upCells + '</div>' +
      '<div class="ip-section-title">快捷表情</div><div class="ip-grid">' + emoCells + '</div>' +
      '<button class="btn btn-ghost btn-block" id="ip-upload">＋ 上传图标（支持动图，无需审核）</button>' +
    '</div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" data-close>取消</button></div>');
  bindClose();
  $$('#modal-panel .ip-cell').forEach((b) => { b.onclick = () => { const v = b.dataset.val; if (pickerCallback) pickerCallback(v); closeModal(); }; });
  $('#ip-upload').onclick = () => triggerIconUpload();
}

function triggerIconUpload() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = () => { const f = inp.files && inp.files[0]; if (f) handleIconUpload(f); };
  inp.click();
}

async function handleIconUpload(f) {
  if (f.size > 5 * 1024 * 1024) { toast('文件过大（>5MB）', 'error'); return; }
  if (!f.type.startsWith('image/')) { toast('请上传图片文件', 'error'); return; }
  if (f.type === 'image/gif') {
    const r = new FileReader();
    r.onload = async () => {
      try { await addIconToLibrary(r.result); toast('已添加动图到公共图标库', 'success'); await openIconPicker(pickerCallback); }
      catch (e) { toast(e.message || '上传失败', 'error'); }
    };
    r.readAsDataURL(f);
  } else {
    openImageCropper(async (dataUrl) => {
      try { await addIconToLibrary(dataUrl); toast('已添加到公共图标库', 'success'); await openIconPicker(pickerCallback); }
      catch (e) { toast(e.message || '上传失败', 'error'); }
    });
  }
}

/* ---------- 20. 图片裁剪 ---------- */
function openImageCropper(cb) {
  openModal(
    '<div class="modal-title">上传图标并裁剪</div>' +
    '<input type="file" id="crop-file" accept="image/*">' +
    '<div class="crop-stage" id="crop-stage" style="display:none"><div class="crop-box"><img id="crop-img" draggable="false" alt=""></div></div>' +
    '<div id="crop-zoom-row" style="display:none;margin-top:12px"><label style="font-size:13px;color:var(--ink-2);font-weight:600">缩放</label>' +
    '<input type="range" id="crop-zoom" min="1" max="3" step="0.01" value="1" style="width:100%"></div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" data-close>取消</button>' +
    '<button class="btn btn-primary" id="crop-confirm" style="display:none">确定</button></div>');
  bindClose();
  $('#crop-file').onchange = () => {
    const f = $('#crop-file').files && $('#crop-file').files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast('图片过大（>5MB）', 'error'); return; }
    if (!f.type.startsWith('image/')) { toast('请上传图片文件', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = $('#crop-img');
      img.onload = () => {
        $('#crop-stage').style.display = '';
        $('#crop-zoom-row').style.display = '';
        $('#crop-confirm').style.display = '';
        initCrop(img);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  };
  $('#crop-confirm').onclick = () => {
    const dataUrl = cropToCanvas();
    if (dataUrl) { cb(dataUrl); closeModal(); }
  };
}

const cropBox = 200;
let cropState = null;
function initCrop(img) {
  cropState = { img, natW: img.naturalWidth, natH: img.naturalHeight, base: Math.max(cropBox / img.naturalWidth, cropBox / img.naturalHeight), scale: 1, x: 0, y: 0 };
  centerCrop(); positionCrop();
  $('#crop-zoom').oninput = () => { cropState.scale = parseFloat($('#crop-zoom').value); centerCrop(); positionCrop(); };
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
  img.onmousedown = (e) => { dragging = true; sx = e.clientX; sy = e.clientY; ox = cropState.x; oy = cropState.y; e.preventDefault(); };
  window.onmousemove = (e) => { if (!dragging) return; cropState.x = ox + (e.clientX - sx); cropState.y = oy + (e.clientY - sy); clampCrop(); positionCrop(); };
  window.onmouseup = () => { dragging = false; };
  img.ontouchstart = (e) => { dragging = true; const t = e.touches[0]; sx = t.clientX; sy = t.clientY; ox = cropState.x; oy = cropState.y; };
  img.ontouchmove = (e) => { if (!dragging) return; const t = e.touches[0]; cropState.x = ox + (t.clientX - sx); cropState.y = oy + (t.clientY - sy); clampCrop(); positionCrop(); e.preventDefault(); };
  img.ontouchend = () => { dragging = false; };
}
function dispSize() { return { w: cropState.natW * cropState.base * cropState.scale, h: cropState.natH * cropState.base * cropState.scale }; }
function centerCrop() { const d = dispSize(); cropState.x = (cropBox - d.w) / 2; cropState.y = (cropBox - d.h) / 2; }
function clampCrop() {
  const d = dispSize();
  if (d.w <= cropBox) cropState.x = (cropBox - d.w) / 2; else cropState.x = Math.min(0, Math.max(cropBox - d.w, cropState.x));
  if (d.h <= cropBox) cropState.y = (cropBox - d.h) / 2; else cropState.y = Math.min(0, Math.max(cropBox - d.h, cropState.y));
}
function positionCrop() {
  const d = dispSize();
  cropState.img.style.width = d.w + 'px'; cropState.img.style.height = d.h + 'px';
  cropState.img.style.left = cropState.x + 'px'; cropState.img.style.top = cropState.y + 'px';
}
function cropToCanvas() {
  const d = dispSize();
  const s = cropState.base * cropState.scale;
  const canvas = document.createElement('canvas');
  canvas.width = cropBox; canvas.height = cropBox;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(cropState.img, -cropState.x / s, -cropState.y / s, cropBox / s, cropBox / s, 0, 0, cropBox, cropBox);
  return canvas.toDataURL('image/png');
}

/* ---------- 21. 导航设置（拖动排序 / 改名 / 换图标 / 跨父级） ---------- */
let editNav = null;

function openNavSettings() {
  editNav = JSON.parse(JSON.stringify(userConfig.nav));
  renderNavEditor();
}

function navEditRow(item, isPinned) {
  const subs = (item.children || []).map((c) => navEditSubRow(c)).join('');
  return '<div class="nav-edit-item" data-id="' + item.id + '" data-type="top">' +
    '<div class="nav-edit-head">' +
      '<span class="drag-handle" draggable="' + (!isPinned) + '">⠿</span>' +
      '<button class="nav-ic-btn" data-icon="' + item.id + '">' + iconHTML(item.icon, 18) + '</button>' +
      '<input class="nav-name-input" data-name="' + item.id + '" value="' + escapeHtml(item.label) + '">' +
      (isPinned ? '<span class="pin-tag">固定底部</span>' : '') +
    '</div>' + (item.children ? '<div class="nav-edit-subs">' + subs + '</div>' : '') + '</div>';
}
function navEditSubRow(c) {
  return '<div class="nav-edit-sub" data-id="' + c.id + '" data-type="sub" data-parent="' + '' + '">' +
    '<span class="drag-handle" draggable="true">⠿</span>' +
    '<button class="nav-ic-btn" data-icon="' + c.id + '">' + iconHTML(c.icon, 16) + '</button>' +
    '<input class="nav-name-input" data-name="' + c.id + '" value="' + escapeHtml(c.label) + '"></div>';
}

function renderNavEditor() {
  const top = editNav.filter((n) => !n.pinned);
  const pinned = editNav.find((n) => n.pinned);
  const html =
    '<div class="modal-title">导航设置</div>' +
    '<p class="modal-tip">拖动 ⠿ 可排序；把二级导航拖到其它一级导航上可改变归属。配置仅对你本人生效。</p>' +
    '<div class="nav-edit-list">' + top.map((item) => navEditRow(item, false)).join('') + '</div>' +
    '<div class="nav-edit-divider"><span>固定底部（不参与拖动）</span></div>' +
    '<div class="nav-edit-list">' + (pinned ? navEditRow(pinned, true) : '') + '</div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" data-close>取消</button>' +
    '<button class="btn btn-primary" id="nav-save">保存</button></div>';
  openModal(html);
  bindClose();
  bindNavEditEvents();
  $('#nav-save').onclick = async () => {
    userConfig.nav = editNav;
    try { await saveConfig(); closeModal(); renderNav(); renderMobileNav(); toast('导航已保存', 'success'); }
    catch (e) { toast(e.message || '保存失败', 'error'); }
  };
}

function bindNavEditEvents() {
  $$('#modal-panel .nav-name-input').forEach((inp) => {
    inp.oninput = () => {
      const f = findNode(editNav, inp.dataset.name);
      if (f) f.node.label = inp.value;
    };
  });
  $$('#modal-panel .nav-ic-btn').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.icon;
      openIconPicker((val) => {
        const f = findNode(editNav, id);
        if (f) { f.node.icon = val; btn.innerHTML = iconHTML(val, id === 'profile' ? 18 : 18); }
      });
    };
  });

  let dragInfo = null;
  // draggable handles
  $$('#modal-panel .drag-handle').forEach((h) => {
    if (h.getAttribute('draggable') !== 'true') return;
    h.addEventListener('dragstart', (e) => {
      const row = h.closest('[data-id]');
      dragInfo = { id: row.dataset.id, type: row.dataset.type };
      e.dataTransfer.effectAllowed = 'move';
      row.classList.add('dragging');
    });
    h.addEventListener('dragend', () => { const row = h.closest('[data-id]'); if (row) row.classList.remove('dragging'); dragInfo = null; });
  });
  $$('#modal-panel .nav-edit-item, #modal-panel .nav-edit-sub').forEach((el) => {
    el.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add('drop-target'); });
    el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
    el.addEventListener('drop', (e) => {
      e.preventDefault(); e.stopPropagation(); el.classList.remove('drop-target');
      if (!dragInfo) return;
      moveNavNode(dragInfo, el.dataset.id, el.dataset.type);
      renderNavEditor();
    });
  });
}

function moveNavNode(drag, targetId, targetType) {
  if (drag.id === targetId) return;
  const tgt = findNode(editNav, targetId);
  if (!tgt) return;
  const tNode = tgt.node;
  if (tNode.pinned && drag.type === 'sub') return; // 我的 不接受子项
  const dragged = removeNode(editNav, drag.id);
  if (!dragged) return;
  if (targetType === 'top') {
    if (drag.type === 'top') { tgt.arr.splice(tgt.index, 0, dragged); }
    else { tNode.children = tNode.children || []; tNode.children.push(dragged); delete dragged.pinned; }
  } else {
    if (drag.type === 'sub') { tgt.arr.splice(tgt.index, 0, dragged); }
    else { editNav.push(dragged); } // 一级拖到二级上无效，归位到顶部末尾
  }
}

/* ---------- 22. 全局搜索 ---------- */
function bindSearch() {
  const input = $('#global-search');
  if (!input) return;
  let timer = null;
  input.oninput = () => { clearTimeout(timer); timer = setTimeout(() => doSearch(input.value.trim()), 300); };
}

async function doSearch(q) {
  if (!q) { closeModal(); return; }
  const keys = ['tasks', 'lessons', 'plans', 'study', 'students', 'homework'];
  const fields = { tasks: ['title'], lessons: ['subject', 'class_name'], plans: ['title'], study: ['title'], students: ['name'], homework: ['title'] };
  const results = await Promise.all(keys.map(async (k) => {
    const rows = await db.list(MODULES[k].table);
    return rows.filter((r) => fields[k].some((f) => (r[f] || '').toLowerCase().includes(q.toLowerCase()))).map((r) => ({ k, r }));
  }));
  const flat = results.flat();
  if (!flat.length) { toast('未找到相关记录'); return; }
  openModal(
    '<div class="modal-title">搜索结果（' + flat.length + '）</div>' +
    '<div class="list" style="max-height:60vh;overflow:auto">' +
    flat.map(({ k, r }) => '<div class="list-row" style="cursor:pointer" data-k="' + k + '"><div class="row-main"><div class="row-title">' + escapeHtml(MODULES[k].titleOf(r)) + '</div><div class="row-meta"><span class="tag tag-blue">' + MODULES[k].title + '</span></div></div></div>').join('') +
    '</div><div class="modal-actions"><button class="btn btn-ghost" data-close>关闭</button></div>');
  bindClose();
  $$('#modal-panel [data-k]').forEach((row) => { row.onclick = () => { const k = row.dataset.k; closeModal(); navigate(k); }; });
}

/* ---------- 23. 启动 ---------- */
function bindGlobalEvents() {
  $('#send-code-btn').onclick = sendPhoneCode;
  $('#phone-login-btn').onclick = submitPhoneLogin;
  $('#phone-input').oninput = () => { $('#phone-error').textContent = ''; };
  $('#wechat-login-btn').onclick = () => oauthLogin('wechat');
  $('#workbuddy-login-btn').onclick = () => oauthLogin('workbuddy');
  $('#menu-toggle').onclick = () => $('#sidebar').classList.toggle('open');
  window.addEventListener('hashchange', route);
  const label = $('#today-label');
  const d = new Date();
  if (label) label.textContent = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · 周' + ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
}

bindGlobalEvents();
restoreAuth();
