/* ═══════════════════════════════════════════════
   TASK DUNGEON — tasks.js
   ═══════════════════════════════════════════════ */

// ── Palette ─────────────────────────────────────
const COLORS = [
  { label: 'Кровь',    value: '#ed3323' },
  { label: 'Пурпур',   value: '#9b2fc9' },
  { label: 'Ночь',     value: '#2f62c9' },
  { label: 'Лес',      value: '#2f7a3c' },
  { label: 'Золото',   value: '#c47a00' },
  { label: 'Медь',     value: '#b5511a' },
  { label: 'Призрак',  value: '#5a4fbf' },
  { label: 'Пепел',    value: '#8f857c' },
  { label: 'Малина',   value: '#c92f5a' },
  { label: 'Лёд',      value: '#1a9fb5' },
];

const PRIO_META = {
  high: { label: 'ВЫСОКИЙ', dot: '●' },
  med:  { label: 'СРЕДНИЙ',  dot: '●' },
  low:  { label: 'НИЗКИЙ',   dot: '●' },
};

// ── Helpers ─────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4);
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ── Default state ────────────────────────────────
const DEFAULT_STATE = () => ({
  tabs: [
    { id: 'tab1', name: 'Текущие',   color: '#ed3323' },
    { id: 'tab2', name: 'Проекты',   color: '#9b2fc9' },
    { id: 'tab3', name: 'Идеи',      color: '#c47a00' },
  ],
  activeTab: 'tab1',
  tasks: [
    { id: uid(), tabId:'tab1', title:'Слушать Bloody Angel целиком', done:false, priority:'high', date:'', tag:'музыка', notes:'Sematary 2024', createdAt:Date.now() },
    { id: uid(), tabId:'tab1', title:'Изучить репозиторий JANARIK',  done:true,  priority:'med',  date:'', tag:'код',   notes:'', createdAt:Date.now() },
    { id: uid(), tabId:'tab1', title:'Кастомизировать вкладки',      done:false, priority:'low',  date:'', tag:'',     notes:'Нажми ⚙ на вкладке', createdAt:Date.now() },
  ],
  bookmarks: [
    { id: 'bm1', name:'Текущие',  icon:'💀', color:'#ed3323', tabId:'tab1' },
    { id: 'bm2', name:'Проекты',  icon:'🩸', color:'#9b2fc9', tabId:'tab2' },
    { id: 'bm3', name:'Идеи',     icon:'🌑', color:'#c47a00', tabId:'tab3' },
  ],
});

// ── State ────────────────────────────────────────
let S = null;
try { S = JSON.parse(localStorage.getItem('tdState')); } catch(e) {}
if (!S || !S.tabs || !S.tasks) S = DEFAULT_STATE();

const save = () => localStorage.setItem('tdState', JSON.stringify(S));

// ── Toast ────────────────────────────────────────
let _toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
}

// ── Date formatting ──────────────────────────────
function fmtDate(d) {
  if (!d) return null;
  const date  = new Date(d + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diff  = Math.round((date - today) / 86400000);
  const str   = date.toLocaleDateString('ru-RU', { day:'2-digit', month:'short' });
  return { str, overdue: diff < 0 };
}

// ── Color swatches ───────────────────────────────
function renderSwatches(containerId, selected, onChange) {
  const c = $('#' + containerId);
  c.innerHTML = COLORS.map(col =>
    `<div class="color-swatch ${col.value===selected?'selected':''}"
          style="background:${col.value}" data-color="${col.value}"
          title="${col.label}"></div>`
  ).join('');
  c.onclick = e => {
    const sw = e.target.closest('[data-color]');
    if (!sw) return;
    c.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('selected'));
    sw.classList.add('selected');
    onChange(sw.dataset.color);
  };
}

// ══════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════

function renderTabs() {
  // Top tab bar
  $('#tabsList').innerHTML = S.tabs.map(t =>
    `<button class="tab-item ${t.id===S.activeTab?'active':''}"
             data-tab="${t.id}" style="--tab-color:${t.color}">
       <span class="tab-dot"></span>${esc(t.name)}
       <span class="tab-cfg" data-cfg-tab="${t.id}" title="Настройки вкладки">⚙</span>
     </button>`
  ).join('');

  // Sidebar mini-tabs
  $('#sidebarTabsList').innerHTML = S.tabs.map(t =>
    `<div class="bookmark-item ${t.id===S.activeTab?'active':''}"
          data-tab="${t.id}" style="--bm-color:${t.color}">
       <span class="bm-icon" style="color:${t.color}">▶</span>
       <span>${esc(t.name)}</span>
     </div>`
  ).join('');
}

function renderBookmarks() {
  $('#bookmarksList').innerHTML = S.bookmarks.map(bm =>
    `<div class="bookmark-item ${bm.tabId===S.activeTab?'active':''}"
          data-bm="${bm.id}" style="--bm-color:${bm.color}">
       <span class="bm-icon">${bm.icon||'📌'}</span>
       <span>${esc(bm.name)}</span>
       <button class="bm-edit" data-edit-bm="${bm.id}" title="Изменить">✎</button>
     </div>`
  ).join('');
}

let activeFilter = 'all';

function renderTasks() {
  const tab   = S.tabs.find(t => t.id === S.activeTab);
  const all   = S.tasks.filter(t => t.tabId === S.activeTab);
  const done  = all.filter(t => t.done).length;
  const pct   = all.length ? Math.round(done/all.length*100) : 0;

  // Header
  $('#tabTitle').textContent = tab?.name || 'Задачи';
  $('#taskCount').textContent = `${done} / ${all.length} выполнено`;
  $('#progressBar').style.width  = pct + '%';
  $('#progressLabel').textContent = all.length ? pct + '%' : '';

  // Filtered list
  let list = all;
  if (activeFilter === 'done') list = all.filter(t => t.done);
  if (activeFilter === 'todo') list = all.filter(t => !t.done);

  const tbody = $('#taskTableBody');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="td-empty">
      <div class="empty-icon">💀</div>
      <h3>${activeFilter==='done'?'ЕЩЁ НИЧЕГО НЕ ВЫПОЛНЕНО':'СПИСОК ПУСТ'}</h3>
      <p>${activeFilter==='todo'||activeFilter==='all' ? 'НАЖМИ + ЗАДАЧА ЧТОБЫ НАЧАТЬ' : ''}</p>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((t, i) => {
    const date = fmtDate(t.date);
    const p    = PRIO_META[t.priority] || PRIO_META.med;
    return `
    <tr class="${t.done?'is-done':''}" data-task="${t.id}">
      <td class="col-check">
        <label class="custom-check">
          <input type="checkbox" ${t.done?'checked':''} data-toggle="${t.id}">
          <span class="check-box"></span>
        </label>
      </td>
      <td class="col-num">${String(i+1).padStart(2,'0')}</td>
      <td class="col-title"><span class="task-title">${esc(t.title)}</span></td>
      <td class="col-priority">
        <span class="prio ${t.priority}">${p.dot} ${p.label}</span>
      </td>
      <td class="col-date">
        ${date
          ? `<span class="date-cell ${date.overdue?'overdue':''}">${date.str}</span>`
          : '<span style="color:var(--line)">—</span>'}
      </td>
      <td class="col-tags">
        ${t.tag
          ? `<span class="tag">${esc(t.tag)}</span>`
          : '<span style="color:var(--line)">—</span>'}
      </td>
      <td class="col-notes">
        <span class="notes-cell">${t.notes ? esc(t.notes) : '<span style="color:var(--line)">—</span>'}</span>
      </td>
      <td class="col-actions">
        <div class="row-actions">
          <button class="row-btn"     data-edit-task="${t.id}" title="Изменить">✎</button>
          <button class="row-btn del" data-del-task="${t.id}"  title="Удалить">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderAll() {
  renderTabs();
  renderBookmarks();
  renderTasks();
}

// ══════════════════════════════════════════════════
//  TASK MODAL
// ══════════════════════════════════════════════════
let editingTaskId = null;

function openTaskModal(id = null) {
  editingTaskId = id;
  const t = id ? S.tasks.find(x => x.id === id) : null;
  $('#modalTitle').textContent     = id ? 'Изменить задачу' : 'Новая задача';
  $('#taskTitleInput').value        = t?.title    || '';
  $('#taskPriorityInput').value     = t?.priority || 'med';
  $('#taskDateInput').value         = t?.date     || '';
  $('#taskTagInput').value          = t?.tag      || '';
  $('#taskNotesInput').value        = t?.notes    || '';
  $('#taskModal').classList.remove('hidden');
  setTimeout(() => $('#taskTitleInput').focus(), 30);
}

$('#taskForm').onsubmit = e => {
  e.preventDefault();
  const title = $('#taskTitleInput').value.trim();
  if (!title) return;
  if (editingTaskId) {
    const t = S.tasks.find(x => x.id === editingTaskId);
    if (t) {
      t.title    = title;
      t.priority = $('#taskPriorityInput').value;
      t.date     = $('#taskDateInput').value;
      t.tag      = $('#taskTagInput').value.trim();
      t.notes    = $('#taskNotesInput').value.trim();
    }
    toast('Задача обновлена');
  } else {
    S.tasks.push({
      id: uid(), tabId: S.activeTab,
      title, done: false,
      priority: $('#taskPriorityInput').value,
      date:     $('#taskDateInput').value,
      tag:      $('#taskTagInput').value.trim(),
      notes:    $('#taskNotesInput').value.trim(),
      createdAt: Date.now(),
    });
    toast('✓ Задача добавлена');
  }
  save(); renderAll();
  closeModal('taskModal');
};

// ══════════════════════════════════════════════════
//  TAB MODAL
// ══════════════════════════════════════════════════
let editingTabId  = null;
let pickedTabColor = null;

function openTabModal(id) {
  editingTabId = id;
  const isNew = !id;
  const tab = id ? S.tabs.find(t => t.id === id) : null;
  pickedTabColor = tab?.color || COLORS[0].value;

  $('#tabModalTitle').textContent = isNew ? 'Новая вкладка' : 'Настройка вкладки';
  $('#tabNameInput').value = tab?.name || '';
  $('#deleteTabBtn').style.display = (!isNew && S.tabs.length > 1) ? '' : 'none';
  renderSwatches('tabColorSwatches', pickedTabColor, c => { pickedTabColor = c; });
  $('#tabModal').classList.remove('hidden');
  setTimeout(() => $('#tabNameInput').focus(), 30);
}

$('#tabForm').onsubmit = e => {
  e.preventDefault();
  const name = $('#tabNameInput').value.trim();
  if (!name) return;
  if (editingTabId) {
    const tab = S.tabs.find(t => t.id === editingTabId);
    if (tab) { tab.name = name; tab.color = pickedTabColor || tab.color; }
    toast('Вкладка обновлена');
  } else {
    const newId = uid();
    S.tabs.push({ id: newId, name, color: pickedTabColor || COLORS[0].value });
    S.activeTab = newId;
    toast('Вкладка создана');
  }
  save(); renderAll();
  closeModal('tabModal');
};

$('#deleteTabBtn').onclick = () => {
  if (!editingTabId || S.tabs.length <= 1) return;
  if (!confirm('Удалить вкладку и все её задачи?')) return;
  S.tasks    = S.tasks.filter(t => t.tabId !== editingTabId);
  S.bookmarks= S.bookmarks.filter(b => b.tabId !== editingTabId);
  S.tabs     = S.tabs.filter(t => t.id !== editingTabId);
  if (S.activeTab === editingTabId) S.activeTab = S.tabs[0]?.id || '';
  save(); renderAll();
  closeModal('tabModal');
  toast('Вкладка удалена');
};

// ══════════════════════════════════════════════════
//  BOOKMARK MODAL
// ══════════════════════════════════════════════════
let editingBmId  = null;
let pickedBmColor = null;

function populateBmTabSelect() {
  $('#bmTabSelect').innerHTML = S.tabs.map(t =>
    `<option value="${t.id}">${esc(t.name)}</option>`
  ).join('');
}

function openBookmarkModal(id = null) {
  editingBmId = id;
  const bm = id ? S.bookmarks.find(b => b.id === id) : null;
  pickedBmColor = bm?.color || COLORS[0].value;

  $('#bmModalTitle').textContent = id ? 'Изменить закладку' : 'Новая закладка';
  $('#bmNameInput').value  = bm?.name || '';
  $('#bmIconInput').value  = bm?.icon || '📌';
  populateBmTabSelect();
  if (bm?.tabId) $('#bmTabSelect').value = bm.tabId;
  else           $('#bmTabSelect').value = S.activeTab;

  $('#deleteBookmarkBtn').style.display = id ? '' : 'none';
  renderSwatches('bmColorSwatches', pickedBmColor, c => { pickedBmColor = c; });
  $('#bookmarkModal').classList.remove('hidden');
  setTimeout(() => $('#bmNameInput').focus(), 30);
}

$('#bookmarkForm').onsubmit = e => {
  e.preventDefault();
  const name = $('#bmNameInput').value.trim();
  if (!name) return;
  if (editingBmId) {
    const bm = S.bookmarks.find(b => b.id === editingBmId);
    if (bm) {
      bm.name  = name;
      bm.icon  = $('#bmIconInput').value || '📌';
      bm.color = pickedBmColor || bm.color;
      bm.tabId = $('#bmTabSelect').value;
    }
    toast('Закладка обновлена');
  } else {
    S.bookmarks.push({
      id: uid(), name,
      icon:  $('#bmIconInput').value || '📌',
      color: pickedBmColor || COLORS[0].value,
      tabId: $('#bmTabSelect').value,
    });
    toast('Закладка добавлена');
  }
  save(); renderAll();
  closeModal('bookmarkModal');
};

$('#deleteBookmarkBtn').onclick = () => {
  if (!editingBmId) return;
  S.bookmarks = S.bookmarks.filter(b => b.id !== editingBmId);
  save(); renderAll();
  closeModal('bookmarkModal');
  toast('Закладка удалена');
};

// ══════════════════════════════════════════════════
//  MODAL CLOSE HELPERS
// ══════════════════════════════════════════════════
function closeModal(id) {
  $('#' + id).classList.add('hidden');
}

// Universal close handler (data-close-modal="modalId")
document.addEventListener('click', e => {
  const el = e.target.closest('[data-close-modal]');
  if (el) closeModal(el.dataset.closeModal);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['taskModal','tabModal','bookmarkModal'].forEach(id => closeModal(id));
  }
  if (e.key === 'n' && !e.target.matches('input,textarea,select')) {
    e.preventDefault(); openTaskModal();
  }
});

// ══════════════════════════════════════════════════
//  EVENT DELEGATION
// ══════════════════════════════════════════════════

// ── Tabs bar clicks ──────────────────────────────
$('#tabsList').addEventListener('click', e => {
  const cfg = e.target.closest('[data-cfg-tab]');
  if (cfg) { e.stopPropagation(); openTabModal(cfg.dataset.cfgTab); return; }
  const tab = e.target.closest('[data-tab]');
  if (tab) { S.activeTab = tab.dataset.tab; save(); renderAll(); }
});

$('#addTabBtn').onclick = () => openTabModal(null);

// ── Sidebar tab clicks ───────────────────────────
$('#sidebarTabsList').addEventListener('click', e => {
  const item = e.target.closest('[data-tab]');
  if (item) { S.activeTab = item.dataset.tab; save(); renderAll(); }
});

// ── Bookmark clicks ──────────────────────────────
$('#bookmarksList').addEventListener('click', e => {
  const editBtn = e.target.closest('[data-edit-bm]');
  if (editBtn) { e.stopPropagation(); openBookmarkModal(editBtn.dataset.editBm); return; }
  const bm = e.target.closest('[data-bm]');
  if (bm) {
    const found = S.bookmarks.find(b => b.id === bm.dataset.bm);
    if (found?.tabId) { S.activeTab = found.tabId; save(); renderAll(); }
  }
});

$('#addBookmarkBtn').onclick = () => openBookmarkModal(null);

// ── Task table clicks ────────────────────────────
$('#taskTableBody').addEventListener('click', e => {
  // Toggle checkbox
  const toggle = e.target.closest('[data-toggle]');
  if (toggle) {
    const t = S.tasks.find(x => x.id === toggle.dataset.toggle);
    if (t) {
      t.done = toggle.checked;
      save(); renderAll();
      toast(t.done ? '✓ Готово!' : 'Возвращено в список');
    }
    return;
  }
  // Edit
  const editBtn = e.target.closest('[data-edit-task]');
  if (editBtn) { openTaskModal(editBtn.dataset.editTask); return; }
  // Delete
  const delBtn = e.target.closest('[data-del-task]');
  if (delBtn) {
    if (!confirm('Удалить задачу?')) return;
    S.tasks = S.tasks.filter(t => t.id !== delBtn.dataset.delTask);
    save(); renderAll();
    toast('Задача удалена');
  }
});

// ── Add task button ──────────────────────────────
$('#addTaskBtn').onclick = () => openTaskModal();

// ── Filter chips ─────────────────────────────────
$('#filterChips').addEventListener('click', e => {
  const chip = e.target.closest('.chip[data-filter]');
  if (!chip) return;
  $$('#filterChips .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  activeFilter = chip.dataset.filter;
  renderTasks();
});

// ══════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════
renderAll();
