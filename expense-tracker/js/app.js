/* app.js — screens, calculations and features of the Personal Expense Tracker */
'use strict';
 
/* =====================================================================
   1. CATEGORIES (with specific types) — edit freely
   ===================================================================== */
const CATS = [
  { id: 'food', name: 'Food and drinks', icon: '🍔', subs: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Coffee / milk tea', 'Softdrinks and juice', 'Fast food', 'Street food', 'Fruits and desserts', 'Water refill'] },
  { id: 'transport', name: 'Transportation', icon: '🚌', subs: ['Jeepney', 'Tricycle', 'Bus', 'Train / MRT / LRT', 'Taxi / ride-hailing', 'Gasoline / fuel', 'Parking and tolls', 'Vehicle maintenance'] },
  { id: 'school', name: 'School expenses', icon: '🎓', subs: ['Tuition and fees', 'Books and modules', 'School supplies', 'Printing and photocopy', 'Project materials', 'Uniform and ID', 'Field trip / events', 'Online course'] },
  { id: 'shopping', name: 'Shopping and clothing', icon: '🛍️', subs: ['Clothes', 'Shoes', 'Bags and accessories', 'Gadgets and electronics', 'Online shopping', 'Shopee / Lazada order'] },
  { id: 'bills', name: 'Bills and utilities', icon: '💡', subs: ['Electricity', 'Water', 'Internet / Wi-Fi', 'Mobile load / postpaid', 'Rent / dorm', 'LPG / gas', 'Insurance'] },
  { id: 'fun', name: 'Entertainment and games', icon: '🎮', subs: ['Movies / cinema', 'Video games', 'In-game purchases', 'Concerts and events', 'Hobbies', 'Outings and travel'] },
  { id: 'health', name: 'Health and medicine', icon: '💊', subs: ['Medicine', 'Vitamins and supplements', 'Doctor consultation', 'Dental', 'Laboratory / tests', 'Hospital', 'Eyeglasses'] },
  { id: 'personal', name: 'Personal care', icon: '🧴', subs: ['Haircut / salon', 'Skincare', 'Toiletries', 'Cosmetics', 'Gym and fitness', 'Spa / massage'] },
  { id: 'household', name: 'Household expenses', icon: '🏠', subs: ['Groceries and pantry', 'Cleaning supplies', 'Furniture and appliances', 'Repairs and maintenance', 'Kitchenware', 'Pet needs'] },
  { id: 'subs', name: 'Subscriptions', icon: '🔁', subs: ['Netflix / streaming', 'Spotify / music', 'Cloud storage', 'Game pass / app subscription', 'Software / AI tools', 'News / magazine'] },
  { id: 'gifts', name: 'Gifts and donations', icon: '🎁', subs: ['Birthday gift', 'Holiday gift', 'Charity donation', 'Church offering', 'Ambagan / contribution', 'Treat for friends'] },
  { id: 'other', name: 'Other expenses', icon: '📦', subs: ['Emergency', 'Fees and charges', 'Fines / penalties', 'Miscellaneous'] }
];
const PALETTE = ['#0b5ed7', '#e8590c', '#2f9e44', '#ae3ec9', '#f59f00', '#1098ad', '#d6336c', '#5c940d', '#495057', '#7048e8', '#e03131', '#868e96'];
const TIPS = ["Every peso has a story — let's read yours.", 'Small savings today become big goals tomorrow.', 'Track it, plan it, own it.', 'A budget tells your money where to go.', 'Tiny daily habits build big savings.'];
 
/* =====================================================================
   2. STATE + SMALL HELPERS
   ===================================================================== */
const S = {
  user: null, display: '', expenses: [], budget: { monthly: 0, cats: {} }, goals: [], recurring: [],
  view: 'home', editId: null, selCat: null,
  f: { q: '', cat: '', from: '', to: '' },
  dashMonth: '', dashMode: 'day', dashVal: '',
  cmp: null
};
let charts = [], toastTimer;
 
const $ = (sel, el = document) => el.querySelector(sel);
const cat = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];
const peso = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayStr = () => fmtDate(new Date());
const monthKey = s => s.slice(0, 7);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sum = list => list.reduce((t, e) => t + Number(e.amount), 0);
const opt = (val, cur, label) => `<option value="${val}" ${val === cur ? 'selected' : ''}>${label}</option>`;
 
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 3500);
}
 
/* ISO week helpers (for the "week" pickers) */
function weekStart(v) {                               // "2026-W44" -> Monday of that week
  const [y, w] = v.split('-W').map(Number);
  const jan4 = new Date(y, 0, 4);
  const mon = addDays(jan4, -((jan4.getDay() + 6) % 7));
  return addDays(mon, (w - 1) * 7);
}
function weekValue(d) {                               // Date -> "2026-W44"
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const w1 = new Date(t.getFullYear(), 0, 4);
  const wk = 1 + Math.round(((t - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
  return `${t.getFullYear()}-W${pad(wk)}`;
}
function rangeOf(mode, v) {                           // -> [startDate, endDate] as strings
  if (mode === 'month') { const [y, m] = v.split('-').map(Number); return [`${v}-01`, fmtDate(new Date(y, m, 0))]; }
  if (mode === 'week') { const s = weekStart(v); return [fmtDate(s), fmtDate(addDays(s, 6))]; }
  return [v, v];
}
const inRange = (list, [a, b]) => list.filter(e => e.date >= a && e.date <= b);
const inputType = { day: 'date', week: 'week', month: 'month' };
const defaultVal = mode => mode === 'day' ? todayStr() : mode === 'week' ? weekValue(new Date()) : monthKey(todayStr());
 
/* =====================================================================
   3. DATA LOADING + CALCULATIONS
   ===================================================================== */
async function loadAll() {
  S.expenses = (await DB.byUser('expenses', S.user)).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id);
  S.budget = (await DB.get('budgets', S.user)) || { user: S.user, monthly: 0, cats: {} };
  S.goals = await DB.byUser('goals', S.user);
  S.recurring = await DB.byUser('recurring', S.user);
}
 
function totalsByCat(list) {
  const t = {}; list.forEach(e => { t[e.cat] = (t[e.cat] || 0) + Number(e.amount); }); return t;
}
 
function monthStats(mk) {
  const list = S.expenses.filter(e => monthKey(e.date) === mk);
  const [y, m] = mk.split('-').map(Number);
  const dim = new Date(y, m, 0).getDate();
  const elapsed = mk === monthKey(todayStr()) ? new Date().getDate() : dim;
  const byCat = totalsByCat(list);
  const ranked = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const total = sum(list);
  return {
    list, total, byCat, dim, elapsed, dailyAvg: total / elapsed,
    days: new Set(list.map(e => e.date)).size,
    largest: list.reduce((a, e) => (!a || e.amount > a.amount) ? e : a, null),
    top: ranked[0], least: ranked[ranked.length - 1]
  };
}
 
function budgetStatus() {
  const st = monthStats(monthKey(todayStr()));
  const lim = Number(S.budget.monthly) || 0;
  const left = lim - st.total;
  const used = lim ? st.total / lim * 100 : 0;
  return { ...st, lim, left, used, level: !lim ? 'none' : st.total > lim ? 'over' : used >= 80 ? 'warn' : 'ok' };
}
 
function alerts() {
  const out = [], b = budgetStatus();
  if (b.level === 'over') out.push({ t: 'danger', m: `You exceeded your monthly budget by ${peso(-b.left)}!` });
  else if (b.level === 'warn') out.push({ t: 'warn', m: `You used ${b.used.toFixed(0)}% of your monthly budget — only ${peso(b.left)} left.` });
  Object.entries(S.budget.cats || {}).forEach(([id, lim]) => {
    const sp = b.byCat[id] || 0;
    if (sp > lim) out.push({ t: 'danger', m: `${cat(id).name}: over budget by ${peso(sp - lim)}.` });
    else if (sp >= lim * 0.8) out.push({ t: 'warn', m: `${cat(id).name}: ${(sp / lim * 100).toFixed(0)}% of its budget used.` });
  });
  if (b.lim && b.level !== 'over' && b.dailyAvg * b.dim > b.lim)
    out.push({ t: 'warn', m: `At this pace you will spend about ${peso(b.dailyAvg * b.dim)} this month — above your ${peso(b.lim)} limit.` });
  return out;
}
 
/* A transaction is flagged when it pushes its category (or the whole month) past a limit */
function flaggedIds() {
  const flags = new Set(), catRun = {}, monRun = {};
  [...S.expenses].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id).forEach(e => {
    const mk = monthKey(e.date), ck = mk + '|' + e.cat;
    catRun[ck] = (catRun[ck] || 0) + Number(e.amount);
    monRun[mk] = (monRun[mk] || 0) + Number(e.amount);
    const cl = S.budget.cats[e.cat];
    if ((cl && catRun[ck] > cl) || (S.budget.monthly && monRun[mk] > S.budget.monthly)) flags.add(e.id);
  });
  return flags;
}
 
/* Duplicate detection: same date + category + type + amount */
function dupIds() {
  const seen = {}, dups = new Set();
  S.expenses.forEach(e => {
    const k = [e.date, e.cat, e.sub, Number(e.amount)].join('|');
    if (seen[k]) { dups.add(e.id); dups.add(seen[k]); } else seen[k] = e.id;
  });
  return dups;
}
const isDuplicate = r => S.expenses.some(e => e.date === r.date && e.cat === r.cat && e.sub === r.sub && Number(e.amount) === Number(r.amount));
 
function overMessage(rec) {
  const st = monthStats(monthKey(rec.date)), cl = S.budget.cats[rec.cat], c = st.byCat[rec.cat] || 0, lim = S.budget.monthly;
  if (cl && c > cl) return `🚨 ${cat(rec.cat).name} is over its budget!`;
  if (lim && st.total > lim) return '🚨 You exceeded your monthly budget!';
  if (cl && c >= cl * 0.8) return `⚠️ ${cat(rec.cat).name} is close to its budget.`;
  if (lim && st.total >= lim * 0.8) return '⚠️ You are close to your monthly budget.';
  return '';
}
 
/* Recurring reminders: due within 7 days or overdue */
function reminders() {
  const t = parseDate(todayStr());
  return S.recurring.map(r => ({ r, days: Math.round((parseDate(r.next) - t) / 86400000) }))
    .filter(x => x.days <= 7).sort((a, b) => a.days - b.days);
}
function advance(dateStr, freq) {
  const d = parseDate(dateStr);
  if (freq === 'weekly') d.setDate(d.getDate() + 7);
  else if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return fmtDate(d);
}
 
/* Automatic savings: runs every time the app opens and catches up on missed days/weeks */
async function runAutoSavings() {
  const today = parseDate(todayStr());
  for (const g of S.goals) {
    const a = g.auto; if (!a || a.mode === 'none') continue;
    const step = a.freq === 'weekly' ? 7 : 1;
    const start = parseDate(a.last); let last = start, added = 0, guard = 0;
    while (guard++ < 120) {
      const end = addDays(last, step);
      if (end >= today) break;                              // only count fully finished days
      let amt = 0;
      if (a.mode === 'fixed') amt = Number(a.amount) || 0;
      else if (S.budget.monthly) {                          // "save my unspent daily budget"
        for (let i = 1; i <= step; i++) {
          const d = addDays(last, i), ds = fmtDate(d);
          const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
          amt += S.budget.monthly / dim - sum(S.expenses.filter(e => e.date === ds));
        }
        amt = Math.max(0, amt);
      }
      amt = Math.min(amt, Math.max(0, g.target - g.saved - added));
      added += amt; last = end;
    }
    if (last.getTime() !== start.getTime()) {
      g.saved = Math.round((g.saved + added) * 100) / 100; a.last = fmtDate(last);
      await DB.put('goals', g);
    }
  }
}
 
/* =====================================================================
   4. ROUTER + SHARED PIECES
   ===================================================================== */
const VIEWS = {}, BIND = {}, ACTIONS = {};
 
function go(view) {
  S.view = view;
  charts.forEach(c => c.destroy()); charts = [];
  window.scrollTo(0, 0);
  $('#app').innerHTML = VIEWS[view]();
  if (BIND[view]) BIND[view]();
}
const head = (title, icon) => `<div class="page-head"><button class="btn ghost" data-go="home">← Home</button><h2>${icon} ${title}</h2></div>`;
const stat = (label, value, cls = '') => `<div class="stat ${cls}"><small>${label}</small><b>${value}</b></div>`;
const fact = (icon, title, body) => `<div class="fact"><small>${icon} ${title}</small><b>${body}</b></div>`;
 
function mkChart(id, cfg) {
  const el = $('#' + id); if (!el) return;
  if (typeof Chart === 'undefined') { el.outerHTML = '<p class="muted">Chart library missing — see Step 2 of the guide.</p>'; return; }
  Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#222';
  charts.push(new Chart(el, cfg));
}
 
function expList(list, actions = true) {
  if (!list.length) return '<p class="muted center">No expenses found.</p>';
  const fl = flaggedIds(), dup = dupIds();
  return `<ul class="exp-list">${list.map(e => `<li>
    <span class="e-icon">${cat(e.cat).icon}</span>
    <div class="e-main"><b>${esc(e.sub || cat(e.cat).name)}</b>
      ${fl.has(e.id) ? '<span class="badge danger">over limit</span>' : ''} ${dup.has(e.id) ? '<span class="badge warn">duplicate?</span>' : ''}
      <small>${e.date} · ${cat(e.cat).name}${e.note ? ' · ' + esc(e.note) : ''}</small></div>
    <div class="e-amt">${peso(e.amount)}</div>
    ${actions ? `<div class="e-act"><button class="icon-btn" title="Edit" data-act="editExp" data-id="${e.id}">✏️</button><button class="icon-btn" title="Delete" data-act="delExp" data-id="${e.id}">🗑️</button></div>` : ''}
  </li>`).join('')}</ul>`;
}
 
/* =====================================================================
   5. LOGIN / CREATE ACCOUNT
   ===================================================================== */
function showAuth(tab) {
  S.user = null; $('#logoutBtn').classList.add('hidden');
  const hello = '<div class="card center"><h2>Kumusta! 👋 Welcome!</h2><p class="muted">Take control of your money — one peso at a time.</p></div>';
  if (tab === 'register') {
    $('#app').innerHTML = `${hello}<form id="regForm" class="card auth">
      <h2>Create Your Personal Expense Tracker Account</h2>
      <label>Username<input name="username" required minlength="3" maxlength="20" autocomplete="username"></label>
      <label>Password<input name="password" type="password" required minlength="6" autocomplete="new-password"></label>
      <label>Repeat password<input name="repeat" type="password" required autocomplete="new-password"></label>
      <label>Date of birth<input name="dob" type="date" required max="${todayStr()}"></label>
      <div class="cap-box"><b>🤖 Captcha — prove you are not a robot</b>
        <div class="row"><canvas id="cap" width="160" height="50"></canvas><button type="button" class="icon-btn" id="capNew" title="New code">🔄</button></div>
        <input name="captcha" required placeholder="Type the characters above" autocomplete="off"></div>
      <div class="msg" id="msg"></div>
      <button class="btn primary" style="width:100%">Create account</button>
      <p class="muted center">Already have an account? <a href="#" id="toLogin">Log in</a></p></form>`;
    Captcha.draw($('#cap'));
    $('#capNew').onclick = () => Captcha.draw($('#cap'));
    $('#toLogin').onclick = e => { e.preventDefault(); showAuth('login'); };
    $('#regForm').onsubmit = async e => {
      e.preventDefault();
      const r = await Auth.register(Object.fromEntries(new FormData(e.target)));
      if (!r.ok) { $('#msg').textContent = r.error; Captcha.draw($('#cap')); return; }
      await startSession(r.user);
    };
  } else {
    $('#app').innerHTML = `${hello}<form id="loginForm" class="card auth">
      <h2>Log in</h2>
      <label>Username<input name="username" required autocomplete="username"></label>
      <label>Password<input name="password" type="password" required autocomplete="current-password"></label>
      <div class="msg" id="msg"></div>
      <button class="btn primary" style="width:100%">Log in</button>
      <p class="muted center">New here? <a href="#" id="toReg">Create an account</a></p></form>`;
    $('#toReg').onclick = e => { e.preventDefault(); showAuth('register'); };
    $('#loginForm').onsubmit = async e => {
      e.preventDefault();
      const f = new FormData(e.target), r = await Auth.login(f.get('username'), f.get('password'));
      if (!r.ok) { $('#msg').textContent = r.error; return; }
      await startSession(r.user);
    };
  }
}
 
async function startSession(user) {
  S.user = user.username; S.display = user.display;
  S.dashMonth = monthKey(todayStr()); S.dashMode = 'day'; S.dashVal = todayStr(); S.cmp = null;
  await loadAll(); await runAutoSavings();
  $('#logoutBtn').classList.remove('hidden');
  go('home');
}
 
/* =====================================================================
   6. HOME
   ===================================================================== */
VIEWS.home = () => {
  const b = budgetStatus(), al = alerts(), rem = reminders();
  const h = new Date().getHours();
  const hello = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + `, ${esc(S.display)}! 👋`;
  const goal = S.goals.filter(g => g.saved < g.target).sort((a, b) => b.saved / b.target - a.saved / a.target)[0] || S.goals[0];
  const goalBar = goal
    ? `<span class="mini">${esc(goal.name)} — ${peso(goal.saved)} / ${peso(goal.target)}<span class="bar small"><span class="fill" style="width:${Math.min(100, goal.saved / goal.target * 100)}%"></span></span></span>`
    : '<span class="mini muted">No goal yet — tap to create one</span>';
  const tile = (to, icon, title, desc, extra = '') => `<button class="tile" data-go="${to}"><span class="t-icon">${icon}</span><span class="t-title">${title}</span><span class="t-desc">${desc}</span>${extra}</button>`;
  const wd = {}; S.expenses.forEach(e => { const d = parseDate(e.date).getDay(); wd[d] = (wd[d] || 0) + Number(e.amount); });
  const busiest = Object.entries(wd).sort((a, b) => b[1] - a[1])[0];
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
 
  return `
  <section class="card"><h2>${hello}</h2><p class="muted">${TIPS[Math.floor(Date.now() / 86400000) % TIPS.length]}</p></section>
 
  <section class="card budget ${b.level}">
    <div class="row between"><div><small>Budget left this month</small><div class="big">${b.lim ? peso(b.left) : 'No budget set'}</div></div>
      <div class="muted">${peso(b.total)} spent${b.lim ? ' of ' + peso(b.lim) : ''}</div></div>
    <div class="bar"><div class="fill" style="width:${b.lim ? Math.max(0, 100 - b.used) : 0}%"></div></div>
    ${b.lim ? '' : '<p class="muted">Tap “Manage Budgets” to set a monthly limit.</p>'}
    ${al.map(a => `<div class="alert ${a.t}">${a.t === 'danger' ? '🚨' : '⚠️'} ${esc(a.m)}</div>`).join('')}
  </section>
 
  <section class="tiles">
    ${tile('record', '📝', 'Record Expense', "Add today's spending by category")}
    ${tile('dashboard', '📊', 'Spending Dashboard', 'Totals, charts, import / export')}
    ${tile('budgets', '💼', 'Manage Budgets', 'Monthly limit and category budgets')}
    ${tile('expenses', '🔎', 'View Expense', 'Browse and filter every transaction')}
    ${tile('savings', '🎯', 'Savings Goal Tracker', 'Save for the things you want', goalBar)}
    ${tile('compare', '⚖️', 'Compare Expenses', 'Day vs day, week vs week, month vs month')}
  </section>
 
  <h3>💡 Spending insights</h3>
  <section class="facts">
    ${fact('🔔', 'Smart Spending Alerts', al.length ? `${al.length} active<small>${esc(al[0].m)}</small>` : 'All clear!<small>You are within your limits.</small>')}
    ${fact('📅', 'Daily Spending Average', `${peso(b.dailyAvg)}<small>per day this month</small>`)}
    ${fact('🏆', 'Category Most Spent', b.top ? `${cat(b.top[0]).icon} ${cat(b.top[0]).name}<small>${peso(b.top[1])}</small>` : 'No data yet')}
    ${fact('🌱', 'Category Least Spent', b.least ? `${cat(b.least[0]).icon} ${cat(b.least[0]).name}<small>${peso(b.least[1])}</small>` : 'No data yet')}
    ${fact('📈', 'Projected Month-End Spending', `${peso(b.dailyAvg * b.dim)}<small>if you keep this pace</small>`)}
    ${fact('🧘', 'No-Spend Days', `${b.elapsed - b.days}<small>so far this month</small>`)}
    ${fact('🗓️', 'Busiest Spending Day', busiest ? `${names[busiest[0]]}<small>${peso(busiest[1])} in total</small>` : 'No data yet')}
    <div class="fact"><small>⏰ Recurring Expense Reminders</small>
      ${rem.length ? rem.map(({ r, days }) => `<div class="rem"><span>${cat(r.cat).icon} ${esc(r.sub)} · ${peso(r.amount)}<small>${days < 0 ? 'overdue by ' + (-days) + ' day(s)' : days === 0 ? 'due today' : 'due in ' + days + ' day(s)'}</small></span>
        <span><button class="icon-btn" title="Add now" data-act="recAdd" data-id="${r.id}">➕</button><button class="icon-btn" title="Skip / remove" data-act="recDel" data-id="${r.id}">✖</button></span></div>`).join('')
        : '<b>Nothing due</b><small>Tick “Recurring” when recording bills or subscriptions.</small>'}
    </div>
  </section>`;
};
 
/* =====================================================================
   7. RECORD EXPENSE
   ===================================================================== */
VIEWS.record = () => {
  const ed = S.editId ? S.expenses.find(e => e.id === S.editId) : null;
  const c = S.selCat ? cat(S.selCat) : null, today = todayStr();
  return `${head('Record Expense', '📝')}
  <div class="card"><h3>1. Choose a category</h3><div class="cat-grid">
    ${CATS.map(k => `<button type="button" class="cat ${S.selCat === k.id ? 'sel' : ''}" data-act="pickCat" data-id="${k.id}"><span>${k.icon}</span>${k.name}</button>`).join('')}
  </div></div>
  ${c ? `<form id="expForm" class="card">
    <h3>2. ${ed ? 'Edit' : 'Add'} expense — ${c.icon} ${c.name}</h3>
    <label>Specific type<select name="sub">${c.subs.map(s => opt(s, ed && ed.sub, s)).join('')}</select></label>
    <label>Amount (₱)<input name="amount" type="number" min="0.01" step="0.01" required value="${ed ? ed.amount : ''}"></label>
    <label>Date<input name="date" type="date" required value="${ed ? ed.date : today}"></label>
    <label>Note (optional)<input name="note" maxlength="80" value="${ed ? esc(ed.note) : ''}" placeholder="e.g. lunch with friends"></label>
    ${ed ? '' : `<label class="check"><input type="checkbox" name="rec"> 🔁 Recurring expense (subscription, bill, rent…)</label>
    <label>Repeats<select name="freq"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="yearly">Yearly</option></select></label>`}
    <div class="row"><button class="btn primary" type="submit">${ed ? 'Save changes' : 'Add expense'}</button>
      ${ed ? '<button type="button" class="btn ghost" data-act="cancelEdit">Cancel</button>' : ''}</div>
  </form>` : '<p class="muted center">Pick a category above to continue.</p>'}
  <div class="card"><h3>Today's expenses — ${peso(sum(S.expenses.filter(e => e.date === today)))}</h3>${expList(S.expenses.filter(e => e.date === today))}</div>`;
};
 
BIND.record = () => {
  const f = $('#expForm'); if (!f) return;
  f.addEventListener('submit', async ev => {
    ev.preventDefault();
    const fd = new FormData(f);
    const rec = { user: S.user, cat: S.selCat, sub: fd.get('sub'), amount: Math.round(parseFloat(fd.get('amount')) * 100) / 100, date: fd.get('date'), note: (fd.get('note') || '').trim() };
    if (!(rec.amount > 0)) return toast('Please enter a valid amount.');
    let msg;
    if (S.editId) {
      rec.id = S.editId; await DB.put('expenses', rec); S.editId = null; msg = 'Expense updated ✔';
    } else {
      if (isDuplicate(rec) && !confirm('⚠ A similar expense already exists (same date, category, type and amount). Add it anyway?')) return;
      await DB.add('expenses', rec); msg = 'Expense added ✔';
      if (fd.get('rec')) await DB.add('recurring', { user: S.user, cat: rec.cat, sub: rec.sub, amount: rec.amount, note: rec.note, freq: fd.get('freq'), next: advance(rec.date, fd.get('freq')) });
    }
    await loadAll();
    toast(overMessage(rec) || msg);
    go('record');
  });
};
 
/* =====================================================================
   8. SPENDING DASHBOARD  (+ CSV / JSON import and export)
   ===================================================================== */
VIEWS.dashboard = () => {
  const st = monthStats(S.dashMonth), lim = Number(S.budget.monthly) || 0, left = lim - st.total;
  const rl = inRange(S.expenses, rangeOf(S.dashMode, S.dashVal));
  return `${head('Spending Dashboard', '📊')}
  <div class="card"><label>Month to analyse<input type="month" id="dashMonth" value="${S.dashMonth}"></label></div>
  <div class="stats">
    ${stat('Total spending', peso(st.total))}
    ${stat('Remaining budget', lim ? peso(left) : 'No budget set', lim && left < 0 ? 'danger' : '')}
    ${stat('Largest expense', st.largest ? `${peso(st.largest.amount)}<small>${esc(st.largest.sub || cat(st.largest.cat).name)} · ${st.largest.date}</small>` : '—')}
    ${stat('Most expensive category', st.top ? `${cat(st.top[0]).icon} ${cat(st.top[0]).name}<small>${peso(st.top[1])}</small>` : '—')}
  </div>
  <div class="card"><h3>📈 Spending trend (per day)</h3><canvas id="trendChart" height="200"></canvas></div>
  <div class="card"><h3>🍩 Spending by category</h3><canvas id="catChart" height="220"></canvas></div>
  <div class="card"><h3>📂 Browse records by day / week / month</h3>
    <div class="row"><select id="dashMode" style="width:auto">${opt('day', S.dashMode, 'Day')}${opt('week', S.dashMode, 'Week')}${opt('month', S.dashMode, 'Month')}</select>
      <input id="dashVal" type="${inputType[S.dashMode]}" value="${S.dashVal}" style="width:auto"></div>
    <p><b>${rl.length}</b> record(s) · <b>${peso(sum(rl))}</b></p>${expList(rl)}</div>
  <div class="card"><h3>📤 Import / Export</h3>
    <div class="row"><button class="btn" data-act="exportCSV">Export CSV (opens in Excel)</button><button class="btn" data-act="exportJSON">Backup (JSON)</button></div>
    <label style="margin-top:12px">Import a CSV or JSON backup<input type="file" id="importFile" accept=".csv,.json"></label>
    <small>CSV columns: date, category, type, amount, note. Duplicates are skipped automatically.</small></div>`;
};
 
BIND.dashboard = () => {
  $('#dashMonth').onchange = e => { S.dashMonth = e.target.value || S.dashMonth; go('dashboard'); };
  $('#dashMode').onchange = e => { S.dashMode = e.target.value; S.dashVal = defaultVal(S.dashMode); go('dashboard'); };
  $('#dashVal').onchange = e => { S.dashVal = e.target.value || S.dashVal; go('dashboard'); };
  $('#importFile').onchange = e => e.target.files[0] && importFile(e.target.files[0]);
 
  const st = monthStats(S.dashMonth), labels = [], data = [];
  for (let d = 1; d <= st.dim; d++) { labels.push(d); data.push(sum(st.list.filter(e => e.date === `${S.dashMonth}-${pad(d)}`))); }
  mkChart('trendChart', { type: 'line', data: { labels, datasets: [{ label: 'Spent (₱)', data, borderColor: '#0b5ed7', backgroundColor: 'rgba(11,94,215,.15)', fill: true, tension: 0.3 }] }, options: { plugins: { legend: { display: false } } } });
  const ent = Object.entries(st.byCat);
  mkChart('catChart', { type: 'doughnut', data: { labels: ent.map(([k]) => cat(k).name), datasets: [{ data: ent.map(([, v]) => v), backgroundColor: ent.map(([k]) => PALETTE[CATS.findIndex(c => c.id === k)]) }] } });
};
 
/* ---- CSV / JSON helpers ---- */
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
 
function parseCSV(text) {
  const rows = []; let row = [], cur = '', quoted = false;
  const endRow = () => { row.push(cur); cur = ''; if (row.some(x => x.trim() !== '')) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else quoted = false; } else cur += c; }
    else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; endRow(); }
    else cur += c;
  }
  endRow();
  return rows;
}
function normDate(s) {
  s = String(s || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s); return isNaN(d) ? null : fmtDate(d);
}
 
async function importFile(file) {
  const text = (await file.text()).replace(/^\ufeff/, '');
  let added = 0, skipped = 0;
  if (file.name.toLowerCase().endsWith('.json')) {
    const j = JSON.parse(text);
    for (const r of j.expenses || []) {
      const rec = { ...r, user: S.user }; delete rec.id;
      if (isDuplicate(rec)) { skipped++; continue; }
      await DB.add('expenses', rec); S.expenses.push(rec); added++;
    }
    if (j.budget) { S.budget = { user: S.user, monthly: j.budget.monthly || 0, cats: j.budget.cats || {} }; await DB.put('budgets', S.budget); }
    for (const g of j.goals || []) if (!S.goals.some(x => x.name === g.name)) { const rec = { ...g, user: S.user }; delete rec.id; await DB.add('goals', rec); }
  } else {
    const rows = parseCSV(text);
    if (rows.length && /date/i.test(rows[0][0])) rows.shift();
    for (const r of rows) {
      const date = normDate(r[0]), amount = parseFloat(String(r[3]).replace(/[₱,\s]/g, ''));
      if (!date || !(amount > 0)) { skipped++; continue; }
      const key = String(r[1] || '').trim().toLowerCase();
      const c = CATS.find(k => k.name.toLowerCase() === key || k.id === key) || CATS[CATS.length - 1];
      const rec = { user: S.user, cat: c.id, sub: (r[2] || '').trim() || c.subs[0], amount: Math.round(amount * 100) / 100, date, note: (r[4] || '').trim() };
      if (isDuplicate(rec)) { skipped++; continue; }
      await DB.add('expenses', rec); S.expenses.push(rec); added++;
    }
  }
  await loadAll(); toast(`Imported ${added} record(s), skipped ${skipped}.`); go(S.view);
}
 
/* =====================================================================
   9. MANAGE BUDGETS
   ===================================================================== */
VIEWS.budgets = () => {
  const b = budgetStatus(), cb = S.budget.cats, total = Object.values(cb).reduce((t, x) => t + Number(x), 0);
  return `${head('Manage Budgets', '💼')}
  <div class="card"><small>Total budget right now</small><div class="big">${peso(S.budget.monthly)}</div>
    <p class="muted">${peso(b.total)} spent this month · ${peso(Math.max(0, b.left))} left</p>
    <form id="monthForm" class="row"><input name="m" type="number" min="1" step="0.01" placeholder="Monthly limit (₱)" required style="flex:1"><button class="btn primary">Set monthly limit</button>
      <button type="button" class="btn ghost" data-act="clearMonthly">Remove</button></form></div>
  <form id="catBudgetForm" class="card"><h3>Add or update a category budget</h3>
    <label>Category<select name="c">${CATS.map(k => `<option value="${k.id}">${k.icon} ${k.name}</option>`).join('')}</select></label>
    <label>Budget (₱)<input name="a" type="number" min="1" step="0.01" required></label>
    <button class="btn primary">Save category budget</button></form>
  <div class="card"><h3>Category budgets</h3>
    ${Object.keys(cb).length ? Object.entries(cb).map(([id, l]) => {
      const sp = b.byCat[id] || 0;
      return `<div class="cb"><div class="row between"><b>${cat(id).icon} ${cat(id).name}</b><span>${peso(sp)} / ${peso(l)}</span>
        <button class="icon-btn" title="Remove" data-act="delCatBudget" data-id="${id}">🗑️</button></div>
        <div class="bar"><div class="fill ${sp > l ? 'danger' : sp >= l * 0.8 ? 'warn' : ''}" style="width:${Math.min(100, sp / l * 100)}%"></div></div></div>`;
    }).join('') + `<p class="muted">Category budgets add up to ${peso(total)}${S.budget.monthly && total > S.budget.monthly ? ' — more than your monthly limit!' : '.'}</p>` : '<p class="muted">No category budgets yet.</p>'}
  </div>`;
};
 
BIND.budgets = () => {
  $('#monthForm').onsubmit = async e => {
    e.preventDefault(); S.budget.monthly = parseFloat(new FormData(e.target).get('m'));
    await DB.put('budgets', S.budget); toast('Monthly limit saved ✔'); go('budgets');
  };
  $('#catBudgetForm').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    S.budget.cats[f.get('c')] = parseFloat(f.get('a')); await DB.put('budgets', S.budget); toast('Category budget saved ✔'); go('budgets');
  };
};
 
/* =====================================================================
   10. VIEW EXPENSE (search + filters)
   ===================================================================== */
VIEWS.expenses = () => {
  const f = S.f, term = f.q.toLowerCase();
  const list = S.expenses.filter(e => (!f.cat || e.cat === f.cat) && (!f.from || e.date >= f.from) && (!f.to || e.date <= f.to)
    && (!term || `${e.sub} ${e.note} ${cat(e.cat).name}`.toLowerCase().includes(term)));
  return `${head('View Expense', '🔎')}
  <div class="card">
    <div class="chips">${['today', 'week', 'month', 'all'].map(k => `<button class="chip" data-act="quick" data-id="${k}">${{ today: 'Today', week: 'This week', month: 'This month', all: 'All' }[k]}</button>`).join('')}</div>
    <form id="filterForm" class="filters">
      <input name="q" placeholder="🔍 Search…" value="${esc(f.q)}">
      <select name="cat"><option value="">All categories</option>${CATS.map(k => opt(k.id, f.cat, `${k.icon} ${k.name}`)).join('')}</select>
      <label>From<input type="date" name="from" value="${f.from}"></label>
      <label>To<input type="date" name="to" value="${f.to}"></label>
      <button class="btn primary">Apply filters</button></form></div>
  <div class="card"><div class="row between"><h3>${list.length} record(s)</h3><b>${peso(sum(list))}</b></div>${expList(list)}</div>`;
};
BIND.expenses = () => {
  $('#filterForm').onsubmit = e => {
    e.preventDefault(); const fd = new FormData(e.target);
    S.f = { q: fd.get('q').trim(), cat: fd.get('cat'), from: fd.get('from'), to: fd.get('to') }; go('expenses');
  };
};
 
/* =====================================================================
   11. SAVINGS GOAL TRACKER
   ===================================================================== */
function goalCard(g) {
  const p = Math.min(100, g.saved / g.target * 100), a = g.auto || { mode: 'none', freq: 'daily', amount: '' };
  return `<div class="card goal" data-id="${g.id}">
    <div class="row between"><h3>${esc(g.name)}</h3><button class="icon-btn" title="Delete goal" data-act="delGoal" data-id="${g.id}">🗑️</button></div>
    <p><b>${peso(g.saved)}</b> saved of <b>${peso(g.target)}</b> (${p.toFixed(0)}%) ${g.saved >= g.target ? '🎉 Goal reached!' : ''}</p>
    <div class="bar"><div class="fill" style="width:${p}%"></div></div>
    <div class="row"><input class="sv-amt" type="number" min="0.01" step="0.01" placeholder="Amount to save (₱)" style="flex:1"><button class="btn primary" data-act="addSavings" data-id="${g.id}">+ Add savings</button></div>
    <details><summary>⚙️ Automatic savings</summary><div class="auto">
      <label>Mode<select class="a-mode">${opt('none', a.mode, 'Off')}${opt('fixed', a.mode, 'Save a fixed amount')}${opt('remaining', a.mode, 'Save my unspent daily budget')}</select></label>
      <label>How often<select class="a-freq">${opt('daily', a.freq, 'Every day')}${opt('weekly', a.freq, 'Every week')}</select></label>
      <label>Fixed amount (₱)<input class="a-amt" type="number" min="0" step="0.01" value="${a.amount || ''}"></label>
      <button class="btn" data-act="saveAuto" data-id="${g.id}">Save settings</button>
      <small>“Unspent daily budget” = monthly limit ÷ days in the month − what you spent that day.</small></div></details></div>`;
}
VIEWS.savings = () => `${head('Savings Goal Tracker', '🎯')}
  <form id="goalForm" class="card"><h3>New savings goal</h3>
    <label>What are you saving for?<input name="name" required maxlength="40" placeholder="e.g. New laptop"></label>
    <label>Total cost (₱)<input name="target" type="number" min="1" step="0.01" required></label>
    <label>Already saved (₱)<input name="saved" type="number" min="0" step="0.01" value="0"></label>
    <button class="btn primary">Create goal</button></form>
  ${S.goals.map(goalCard).join('') || '<p class="muted center">No goals yet — create your first one above.</p>'}`;
BIND.savings = () => {
  $('#goalForm').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    await DB.add('goals', { user: S.user, name: f.get('name').trim(), target: parseFloat(f.get('target')), saved: parseFloat(f.get('saved')) || 0, auto: { mode: 'none', freq: 'daily', amount: 0, last: todayStr() } });
    await loadAll(); toast('Goal created ✔'); go('savings');
  };
};
 
/* =====================================================================
   12. COMPARE EXPENSES
   ===================================================================== */
function cmpDefaults(mode) {
  const t = new Date();
  if (mode === 'month') return [monthKey(fmtDate(t)), monthKey(fmtDate(new Date(t.getFullYear(), t.getMonth() - 1, 1)))];
  if (mode === 'week') return [weekValue(t), weekValue(addDays(t, -7))];
  return [fmtDate(t), fmtDate(addDays(t, -1))];
}
VIEWS.compare = () => {
  if (!S.cmp) { const [a, b] = cmpDefaults('month'); S.cmp = { mode: 'month', a, b }; }
  const { mode, a, b } = S.cmp;
  const ta = totalsByCat(inRange(S.expenses, rangeOf(mode, a))), tb = totalsByCat(inRange(S.expenses, rangeOf(mode, b)));
  const A = Object.values(ta).reduce((x, y) => x + y, 0), B = Object.values(tb).reduce((x, y) => x + y, 0);
  const rows = CATS.filter(c => ta[c.id] || tb[c.id]);
  const diff = A - B, pct = B ? diff / B * 100 : null;
  const word = { month: 'month', week: 'week', day: 'day' }[mode];
  return `${head('Compare Expenses', '⚖️')}
  <div class="card"><div class="row">
    <select id="cmpMode" style="width:auto">${opt('day', mode, 'Day vs Day')}${opt('week', mode, 'Week vs Week')}${opt('month', mode, 'Month vs Month')}</select>
    <label style="margin:0">A<input id="cmpA" type="${inputType[mode]}" value="${a}"></label>
    <label style="margin:0">B<input id="cmpB" type="${inputType[mode]}" value="${b}"></label>
    <button class="btn" id="cmpSwap">⇄ Swap</button></div></div>
  <div class="card"><h3>${diff === 0 ? 'Same spending in both periods.' : `Period A is ${peso(Math.abs(diff))} ${diff > 0 ? 'MORE' : 'LESS'} than period B${pct !== null ? ` (${Math.abs(pct).toFixed(0)}%)` : ''}.`}</h3>
    <p class="muted">${A === 0 && B === 0 ? `No data for these ${word}s yet.` : `A: ${peso(A)} · B: ${peso(B)}`}</p>
    <canvas id="cmpChart" height="220"></canvas></div>
  <div class="card"><table><tr><th>Category</th><th>A</th><th>B</th><th>Change</th></tr>
    ${rows.map(c => { const d = (ta[c.id] || 0) - (tb[c.id] || 0); return `<tr><td>${c.icon} ${c.name}</td><td>${peso(ta[c.id])}</td><td>${peso(tb[c.id])}</td><td class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : d < 0 ? '▼' : ''} ${peso(Math.abs(d))}</td></tr>`; }).join('')}
    <tr><th>Total</th><th>${peso(A)}</th><th>${peso(B)}</th><th>${peso(Math.abs(diff))}</th></tr></table></div>`;
};
BIND.compare = () => {
  $('#cmpMode').onchange = e => { const [a, b] = cmpDefaults(e.target.value); S.cmp = { mode: e.target.value, a, b }; go('compare'); };
  $('#cmpA').onchange = e => { S.cmp.a = e.target.value || S.cmp.a; go('compare'); };
  $('#cmpB').onchange = e => { S.cmp.b = e.target.value || S.cmp.b; go('compare'); };
  $('#cmpSwap').onclick = () => { [S.cmp.a, S.cmp.b] = [S.cmp.b, S.cmp.a]; go('compare'); };
  const { mode, a, b } = S.cmp;
  const ta = totalsByCat(inRange(S.expenses, rangeOf(mode, a))), tb = totalsByCat(inRange(S.expenses, rangeOf(mode, b)));
  const rows = CATS.filter(c => ta[c.id] || tb[c.id]);
  mkChart('cmpChart', { type: 'bar', data: { labels: rows.map(c => c.name), datasets: [{ label: 'A', data: rows.map(c => ta[c.id] || 0), backgroundColor: '#0b5ed7' }, { label: 'B', data: rows.map(c => tb[c.id] || 0), backgroundColor: '#ffd400' }] } });
};
 
/* =====================================================================
   13. BUTTON ACTIONS (one click listener handles every data-act / data-go)
   ===================================================================== */
ACTIONS.pickCat = el => { S.selCat = el.dataset.id; go('record'); };
ACTIONS.cancelEdit = () => { S.editId = null; go('record'); };
ACTIONS.editExp = el => { const e = S.expenses.find(x => x.id === Number(el.dataset.id)); S.editId = e.id; S.selCat = e.cat; go('record'); };
ACTIONS.delExp = async el => { if (!confirm('Delete this expense?')) return; await DB.del('expenses', Number(el.dataset.id)); await loadAll(); toast('Expense deleted 🗑️'); go(S.view); };
ACTIONS.clearMonthly = async () => { S.budget.monthly = 0; await DB.put('budgets', S.budget); toast('Monthly limit removed'); go('budgets'); };
ACTIONS.delCatBudget = async el => { delete S.budget.cats[el.dataset.id]; await DB.put('budgets', S.budget); toast('Category budget removed'); go('budgets'); };
ACTIONS.quick = el => {
  const t = new Date(), k = el.dataset.id;
  if (k === 'today') S.f.from = S.f.to = todayStr();
  else if (k === 'week') { const s = weekStart(weekValue(t)); S.f.from = fmtDate(s); S.f.to = fmtDate(addDays(s, 6)); }
  else if (k === 'month') [S.f.from, S.f.to] = rangeOf('month', monthKey(todayStr()));
  else S.f = { q: '', cat: '', from: '', to: '' };
  go('expenses');
};
ACTIONS.recAdd = async el => {
  const r = S.recurring.find(x => x.id === Number(el.dataset.id));
  await DB.add('expenses', { user: S.user, cat: r.cat, sub: r.sub, amount: r.amount, date: todayStr(), note: r.note || 'Recurring' });
  r.next = advance(r.next, r.freq); await DB.put('recurring', r);
  await loadAll(); toast('Recurring expense added ✔'); go('home');
};
ACTIONS.recDel = async el => { await DB.del('recurring', Number(el.dataset.id)); await loadAll(); go('home'); };
ACTIONS.delGoal = async el => { if (!confirm('Delete this savings goal?')) return; await DB.del('goals', Number(el.dataset.id)); await loadAll(); go('savings'); };
ACTIONS.addSavings = async el => {
  const g = S.goals.find(x => x.id === Number(el.dataset.id)), amt = parseFloat($('.sv-amt', el.closest('.goal')).value);
  if (!(amt > 0)) return toast('Enter an amount to save.');
  g.saved = Math.round((g.saved + amt) * 100) / 100; await DB.put('goals', g);
  toast(g.saved >= g.target ? '🎉 Goal reached! Congratulations!' : 'Savings added ✔'); go('savings');
};
ACTIONS.saveAuto = async el => {
  const g = S.goals.find(x => x.id === Number(el.dataset.id)), box = el.closest('.goal');
  g.auto = { mode: $('.a-mode', box).value, freq: $('.a-freq', box).value, amount: parseFloat($('.a-amt', box).value) || 0, last: todayStr() };
  if (g.auto.mode === 'fixed' && !(g.auto.amount > 0)) return toast('Enter a fixed amount.');
  if (g.auto.mode === 'remaining' && !S.budget.monthly) toast('Tip: set a monthly limit so the app can compute your unspent budget.');
  else toast('Automatic savings updated ✔');
  await DB.put('goals', g); go('savings');
};
ACTIONS.exportCSV = () => {
  const rows = ['date,category,type,amount,note', ...S.expenses.map(e => [e.date, q(cat(e.cat).name), q(e.sub), e.amount, q(e.note)].join(','))];
  download(`expenses-${todayStr()}.csv`, '\ufeff' + rows.join('\r\n'), 'text/csv'); toast('CSV exported ✔');
};
ACTIONS.exportJSON = () => {
  const strip = ({ id, user, ...rest }) => rest;
  const data = { app: 'expense-tracker', exported: todayStr(), expenses: S.expenses.map(strip), budget: { monthly: S.budget.monthly, cats: S.budget.cats }, goals: S.goals.map(strip) };
  download(`expense-backup-${todayStr()}.json`, JSON.stringify(data, null, 2), 'application/json'); toast('Backup saved ✔');
};
 
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-go],[data-act]'); if (!el) return;
  if (el.dataset.go) { if (el.dataset.go === 'record') { S.editId = null; } go(el.dataset.go); }
  else if (ACTIONS[el.dataset.act]) await ACTIONS[el.dataset.act](el);
});
 
/* =====================================================================
   14. THEME + START-UP
   ===================================================================== */
function applyTheme(t) {
  document.documentElement.dataset.theme = t; localStorage.setItem('et_theme', t);
  $('#themeBtn').textContent = t === 'dark' ? '☀️' : '🌙';
}
 
(async function init() {
  applyTheme(localStorage.getItem('et_theme') || 'light');
  $('#themeBtn').onclick = () => { applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); if (S.user) go(S.view); };
  $('#logoutBtn').onclick = () => { Auth.logout(); showAuth('login'); };
  await DB.open();
  const rec = Auth.current() && await DB.get('users', Auth.current());
  if (rec) await startSession(rec); else showAuth('register');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
