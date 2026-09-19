/* Dinner Planner: UI and logic. Plain JS, no build step. */
(function () {
  'use strict';
  var S = window.DPStore;
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var OUT_LABELS = ['Takeaway', 'Eating out', 'Leftovers', 'Skip'];

  // ---------- helpers ----------
  function $(s, el) { return (el || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); }
  function mondayOf(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return iso(x); }
  function todayIso() { return iso(new Date()); }
  // The week to plan: this week's Monday, or on a Saturday/Sunday (shop time) the coming Monday.
  function planBase() { var d = new Date(); if (d.getDay() === 0) d.setDate(d.getDate() + 1); else if (d.getDay() === 6) d.setDate(d.getDate() + 2); return mondayOf(d); }
  function dayLabel(ws, i) { var d = parseIso(addDays(ws, i)); return DAYS[i] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function rangeLabel(ws) {
    var a = parseIso(ws), b = parseIso(addDays(ws, 6));
    return DAYS[0] + ' ' + a.getDate() + (a.getMonth() !== b.getMonth() ? ' ' + MONTHS[a.getMonth()] : '') + ' – Sun ' + b.getDate() + ' ' + MONTHS[b.getMonth()];
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function trimNum(q) { return String(Math.round(q * 10) / 10); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }

  // ---------- icons ----------
  var P = {
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.4-2"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/>',
    swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    share: '<path d="M12 15V4M8 8l4-4 4 4M5 12v8h14v-8"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M8 4v16"/>',
    cart: '<path d="M3 4h3l2 11h10l2-8H7"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>'
  };
  function ic(n, cls) { return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + P[n] + '</svg>'; }

  // ---------- settings ----------
  var DEF = { cuisines: window.DP_DEFAULT_CUISINES, types: window.DP_DEFAULT_TYPES, people: 2, avoidWeeks: 3, proteinTarget: 35, calTarget: 650 };
  function settings() {
    var s = S.get('settings') || {}, o = {};
    Object.keys(DEF).forEach(function (k) { o[k] = s[k] !== undefined ? s[k] : DEF[k]; });
    return o;
  }
  function saveSettings(patch) { var s = settings(); Object.keys(patch).forEach(function (k) { s[k] = patch[k]; }); S.set('settings', s); }

  // ---------- recipes ----------
  var _rc = null;
  function R() {
    if (_rc) return _rc;
    var map = {};
    window.DP_SEED.forEach(function (r) { map[r.id] = r; });
    S.list('recipe:').forEach(function (x) { if (x.value && x.value.id) map[x.value.id] = x.value; });
    var list = Object.keys(map).map(function (k) { return map[k]; }).filter(function (r) { return !r.deleted; });
    list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    _rc = { list: list, map: {} };
    list.forEach(function (r) { _rc.map[r.id] = r; });
    return _rc;
  }
  function recipe(id) { return R().map[id]; }
  function saveRecipe(r) { S.set('recipe:' + r.id, r); }
  function hue(cuisine) {
    var i = settings().cuisines.indexOf(cuisine);
    if (i < 0) { var h = 0; for (var k = 0; k < cuisine.length; k++) h = (h * 31 + cuisine.charCodeAt(k)) % 360; return h; }
    return (i * 47 + 12) % 360;
  }
  function tile(r, cls) {
    if (r.photo) return '<img class="ph ' + (cls || '') + '" alt="" src="' + r.photo + '">';
    var h = hue(r.cuisine || '');
    return '<div class="ph ' + (cls || '') + '" style="background:linear-gradient(140deg,hsl(' + h + ',62%,58%),hsl(' + ((h + 35) % 360) + ',55%,36%))"><span>' + esc((r.name || '?').charAt(0)) + '</span></div>';
  }
  function macroLine(r) {
    var m = r.macros || {}, out = [];
    if (m.cal) out.push(m.cal + ' kcal');
    if (m.protein) out.push(m.protein + 'g protein');
    return out.join(' · ');
  }

  // ---------- plan ----------
  function planStart() { var m = S.get('plan-meta'); return (m && m.weekStart) || planBase(); }
  function dayKey(ws, i) { return 'day:' + ws + ':' + i; }
  function getDay(ws, i) { return S.get(dayKey(ws, i)) || {}; }
  function setDay(ws, i, patch) { S.set(dayKey(ws, i), Object.assign({}, getDay(ws, i), patch)); }
  function snapshotWeek(ws) { var a = []; for (var i = 0; i < 7; i++) a.push([dayKey(ws, i), deepCopy(getDay(ws, i))]); return a; }
  function restore(snap) { S.setMany(snap); }
  function pastWeekStarts() {
    var cur = planStart(), seen = {};
    S.list('day:').forEach(function (x) {
      var ws = x.key.split(':')[1];
      var d = x.value || {};
      if (ws !== cur && (d.recipeId || d.out)) seen[ws] = 1;
    });
    return Object.keys(seen).sort().reverse();
  }

  // ---------- randomiser ----------
  function recentIds(ws) {
    var n = settings().avoidWeeks, set = {};
    for (var w = 1; w <= n; w++) {
      var pws = addDays(ws, -7 * w);
      for (var i = 0; i < 7; i++) { var d = getDay(pws, i); if (d.recipeId) set[d.recipeId] = 1; }
    }
    return set;
  }
  function randomise(ws, targets) {
    // targets: array of day indexes to (re)fill. Other days are kept as they are.
    var dinners = R().list.filter(function (r) { return r.type === 'Dinner'; });
    if (!dinners.length) return {};
    var week = []; for (var i = 0; i < 7; i++) week.push(getDay(ws, i));
    targets.forEach(function (i) { week[i] = { keepOut: false }; });
    var recent = recentIds(ws), used = {};
    week.forEach(function (d) { if (d.recipeId) used[d.recipeId] = 1; });
    var result = {};
    targets.slice().sort(function (a, b) { return a - b; }).forEach(function (i) {
      function cuisineOf(j) { var d = week[j]; return d && d.recipeId && recipe(d.recipeId) ? recipe(d.recipeId).cuisine : null; }
      var left = i > 0 ? cuisineOf(i - 1) : null, right = i < 6 ? cuisineOf(i + 1) : null;
      function pool(strict) {
        return dinners.filter(function (r) {
          if (used[r.id]) return false;
          if (strict === 0 && recent[r.id]) return false;
          if (strict <= 1 && (r.cuisine === left || r.cuisine === right)) return false;
          return true;
        });
      }
      var c = pool(0); if (!c.length) c = pool(1); if (!c.length) c = pool(2);
      if (!c.length) c = dinners;
      var bag = []; c.forEach(function (r) { var w = r.fav ? 3 : 1; for (var k = 0; k < w; k++) bag.push(r); });
      var pick = bag[rnd(bag.length)];
      used[pick.id] = 1;
      week[i] = { recipeId: pick.id, servings: settings().people, locked: false, sides: [] };
      result[i] = week[i];
    });
    return result;
  }
  function doShuffle(mode) {
    var ws = planStart(), today = todayIso(), targets = [], snap = snapshotWeek(ws);
    for (var i = 0; i < 7; i++) {
      var d = getDay(ws, i);
      if (addDays(ws, i) < today) continue;      // past days stay as they are
      if (d.out) continue;                       // takeaway nights stay
      if (mode === 'unlocked' && d.locked) continue;
      targets.push(i);
    }
    if (!targets.length) { toast('Nothing to shuffle. Unlock a day first.'); return; }
    var res = randomise(ws, targets), pairs = [];
    targets.forEach(function (i) {
      var old = getDay(ws, i);
      pairs.push([dayKey(ws, i), Object.assign({}, res[i], { sides: mode === 'unlocked' ? [] : [] })]);
    });
    S.setMany(pairs);
    toast('Week shuffled', 'Undo', function () { restore(snap); });
  }
  function rollDay(i) {
    var ws = planStart(), snap = snapshotWeek(ws), res = randomise(ws, [i]);
    if (!res[i]) { toast('No dinners in the recipe book yet.'); return; }
    var old = getDay(ws, i);
    setDay(ws, i, { recipeId: res[i].recipeId, servings: old.servings || settings().people, out: false, label: '', locked: false, sides: [] });
    toast('Picked ' + recipe(res[i].recipeId).name, 'Undo', function () { restore(snap); });
  }

  // ---------- shopping list ----------
  function normUnit(u) {
    u = (u || '').toLowerCase().trim();
    if (u === 'kg') return { unit: 'g', f: 1000 };
    if (u === 'l' || u === 'litre' || u === 'litres') return { unit: 'ml', f: 1000 };
    return { unit: u, f: 1 };
  }
  function fmtQty(q, unit) {
    if (unit === 'g' && q >= 1000) return trimNum(q / 1000) + ' kg';
    if (unit === 'ml' && q >= 1000) return trimNum(q / 1000) + ' l';
    if (!unit) return q ? String(Math.ceil(q - 0.001)) : '';
    if (!q) return unit;
    return trimNum(q) + ' ' + unit;
  }
  // Treat "Onion" and "Onions", "Garlic cloves" and "Garlic" as one shopping line.
  function canon(name) {
    var n = name.toLowerCase().replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
    n = n.replace(/^(tin|tins|can|cans|pack|packs|jar|bag|bags) (of )?/, '').replace(/^(fresh|large|small) /, '');
    n = n.replace(/garlic cloves?/, 'garlic');
    return n.split(' ').map(function (w) {
      if (w.length > 3 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
      if (w.length > 4 && /oes$/.test(w)) return w.slice(0, -2);
      if (w.length > 3 && /s$/.test(w) && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
      return w;
    }).join(' ');
  }
  function shoppingItems(ws) {
    var items = {}, people = settings().people;
    for (var i = 0; i < 7; i++) {
      var d = getDay(ws, i);
      if (d.out) continue;
      var ids = [];
      if (d.recipeId) ids.push(d.recipeId);
      (d.sides || []).forEach(function (id) { ids.push(id); });
      ids.forEach(function (id) {
        var r = recipe(id); if (!r) return;
        var scale = (d.servings || people) / (r.serves || 2);
        (r.ingredients || []).forEach(function (ing) {
          if (!ing.name) return;
          var u = normUnit(ing.unit), key = canon(ing.name) + '|' + u.unit;
          var it = items[key] || (items[key] = { key: key, name: ing.name.trim(), unit: u.unit, qty: 0, aisle: ing.aisle || 'Other', meals: [] });
          it.qty += (ing.qty || 0) * u.f * scale;
          if (it.meals.indexOf(r.name) < 0) it.meals.push(r.name);
        });
      });
    }
    return Object.keys(items).map(function (k) { return items[k]; });
  }
  function ticked(ws, key) { var t = S.get('tick:' + ws + ':' + key); return !!(t && t.done); }
  function extras(ws) { return S.list('extra:' + ws + ':').map(function (x) { return x.value; }); }
  function listCounts(ws) {
    var it = shoppingItems(ws), ex = extras(ws), total = it.length + ex.length, done = 0;
    it.forEach(function (x) { if (ticked(ws, x.key)) done++; });
    ex.forEach(function (x) { if (x.done) done++; });
    return { total: total, done: done };
  }

  // ---------- UI state ----------
  var view = 'week';
  try { var sv = localStorage.getItem('dp_view'); if (sv === 'recipes' || sv === 'shop' || sv === 'week') view = sv; } catch (e) { }
  var rf = { q: '', type: 'Dinner', cuisine: '', flag: '' };

  // ---------- layers (sheets / pages) with back-button support ----------
  // Each open layer has one browser-history entry, so the phone's back button closes the top layer instead of leaving the app.
  var layers = [], histDepth = 0, skipPop = 0, backing = false, histTimer = null;
  function syncHist() {
    clearTimeout(histTimer);
    histTimer = setTimeout(function () {
      if (histDepth > layers.length && !backing) { backing = true; skipPop++; try { history.back(); } catch (e) { backing = false; skipPop--; histDepth--; } }
    }, 0);
  }
  function openLayer(node, onClose) {
    document.body.appendChild(node);
    layers.push({ node: node, onClose: onClose });
    try { history.pushState({ dp: 1 }, ''); histDepth++; } catch (e) { }
    document.body.classList.add('noscroll');
  }
  function closeLayer(node) {
    var i = node ? layers.map(function (l) { return l.node; }).indexOf(node) : layers.length - 1;
    if (i < 0) return;
    var l = layers.splice(i, 1)[0];
    l.node.remove();
    if (!layers.length) document.body.classList.remove('noscroll');
    if (l.onClose) l.onClose();
    syncHist();
  }
  window.addEventListener('popstate', function () {
    if (skipPop > 0) { skipPop--; histDepth = Math.max(0, histDepth - 1); backing = false; if (histDepth > layers.length) syncHist(); return; }
    histDepth = Math.max(0, histDepth - 1);
    if (layers.length) {
      var l = layers.pop(); l.node.remove();
      if (!layers.length) document.body.classList.remove('noscroll');
      if (l.onClose) l.onClose();
    }
  });
  function makeSheet(html, cls) {
    var n = document.createElement('div');
    n.className = 'layer';
    n.innerHTML = '<div class="scrim" data-l="close"></div><div class="sheet ' + (cls || '') + '">' + html + '</div>';
    return n;
  }
  function makePage(html, cls) {
    var n = document.createElement('div');
    n.className = 'layer page ' + (cls || '');
    n.innerHTML = html;
    return n;
  }
  function bindLayer(node, handlers) {
    node.addEventListener('click', function (e) {
      var t = e.target.closest('[data-l]'); if (!t || !node.contains(t)) return;
      var name = t.getAttribute('data-l');
      if (name === 'close') { closeLayer(node); return; }
      if (handlers[name]) handlers[name](t, e);
    });
  }
  function confirmSheet(o) {
    return new Promise(function (resolve) {
      var n = makeSheet('<h3 class="disp">' + esc(o.title) + '</h3><p class="muted">' + (o.text || '') + '</p>' + (o.extra || '') +
        '<div class="btnrow"><button class="btn ghost" data-l="close">Cancel</button><button class="btn ' + (o.danger ? 'danger' : 'dark') + '" data-l="ok">' + esc(o.ok || 'OK') + '</button></div>');
      var done = false;
      openLayer(n, function () { if (!done) resolve(null); });
      bindLayer(n, { ok: function () { done = true; var extra = {}; n.querySelectorAll('input[type=checkbox]').forEach(function (c) { extra[c.name] = c.checked; }); closeLayer(n); resolve(extra); } });
    });
  }
  var toastTimer = null;
  function toast(msg, actionLabel, fn) {
    var t = $('#toast');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (actionLabel ? '<button data-toast="1">' + esc(actionLabel) + '</button>' : '');
    t.classList.add('show');
    t.onclick = function (e) { if (e.target.closest('[data-toast]') && fn) { fn(); t.classList.remove('show'); } };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, actionLabel ? 6000 : 2600);
  }

  // ---------- main views ----------
  function nav() {
    var items = [['week', 'Week', 'cal'], ['recipes', 'Recipes', 'book'], ['shop', 'Shopping', 'cart']];
    var ws = planStart(), c = listCounts(ws), left = c.total - c.done;
    return items.map(function (it) {
      return '<button class="nv' + (view === it[0] ? ' on' : '') + '" data-act="nav" data-v="' + it[0] + '"><span class="nvi">' + ic(it[2]) + (it[0] === 'shop' && left > 0 ? '<b class="badge">' + left + '</b>' : '') + '</span>' + it[1] + '</button>';
    }).join('');
  }
  function seg(active) {
    var c = listCounts(planStart()), left = c.total - c.done;
    return '<div class="seg"><button class="' + (active === 'week' ? 'on' : '') + '" data-act="nav" data-v="week">Recipes</button><button class="' + (active === 'shop' ? 'on' : '') + '" data-act="nav" data-v="shop">Shopping list' + (c.total ? ' · ' + left : '') + '</button></div>';
  }

  function weekView() {
    var ws = planStart(), today = todayIso(), st = settings(), html = '';
    var finished = addDays(ws, 6) < today;
    html += '<header class="head"><div><h1 class="disp">This week</h1><small>' + rangeLabel(ws) + ' · ' + st.people + ' people</small></div><button class="ico big" data-act="settings" aria-label="Settings">' + ic('gear') + '</button></header>';
    html += seg('week');
    if (finished) html += '<div class="banner"><b>This week has finished.</b><span>Start a new one when you do your shop.</span><button class="btn sm dark" data-act="new-week">New week</button></div>';
    html += '<div class="row2"><button class="btn dark" data-act="shuffle-all">Shuffle all</button><button class="btn ghost" data-act="shuffle-unlocked">Shuffle unlocked</button></div>';
    var cal = 0, prot = 0, nDin = 0;
    html += '<div class="plan">';
    for (var i = 0; i < 7; i++) {
      var d = getDay(ws, i), dateIso = addDays(ws, i), past = dateIso < today, isToday = dateIso === today;
      var r = d.recipeId ? recipe(d.recipeId) : null;
      html += '<section class="dayblock' + (past ? ' past' : '') + (isToday ? ' today' : '') + '"><div class="dl"><span>' + dayLabel(ws, i) + '</span>' + (isToday ? '<em>Today</em>' : '') + '</div>';
      if (d.out) {
        html += '<article class="mc out"><div class="ph-btn"><div class="ph none">' + ic('cart') + '</div></div><div class="mc-b"><b class="mc-t">' + esc(d.label || 'Takeaway') + '</b><small>Nothing added to the shopping list</small><div class="mrow"><span></span><div class="acts"><button class="ico" data-act="choose" data-d="' + i + '" aria-label="Change">' + ic('swap') + '</button><button class="ico" data-act="out-clear" data-d="' + i + '" aria-label="Clear">' + ic('x') + '</button></div></div></div></article>';
      } else if (r) {
        var sv = d.servings || st.people;
        if (r.macros && r.macros.cal) { cal += r.macros.cal; prot += (r.macros.protein || 0); nDin++; }
        html += '<article class="mc"><button class="ph-btn" data-act="open-recipe" data-id="' + esc(r.id) + '" data-d="' + i + '" aria-label="Open ' + esc(r.name) + '">' + tile(r) + '</button><div class="mc-b"><button class="mc-t" data-act="open-recipe" data-id="' + esc(r.id) + '" data-d="' + i + '">' + esc(r.name) + '</button><small>' + esc(r.cuisine) + ' · ' + (r.time || '?') + ' min' + (macroLine(r) ? ' · ' + macroLine(r) : '') + '</small>' +
          '<div class="mrow"><div class="step"><button data-act="serv" data-d="' + i + '" data-n="-1" aria-label="Fewer servings">−</button><b>' + sv + '</b><button data-act="serv" data-d="' + i + '" data-n="1" aria-label="More servings">+</button></div>' +
          '<div class="acts"><button class="ico' + (d.locked ? ' on' : '') + '" data-act="lock" data-d="' + i + '" aria-label="' + (d.locked ? 'Unlock' : 'Lock') + '">' + ic(d.locked ? 'lock' : 'unlock') + '</button><button class="ico" data-act="dice" data-d="' + i + '" aria-label="Pick another at random">' + ic('dice') + '</button><button class="ico" data-act="choose" data-d="' + i + '" aria-label="Choose a different dinner">' + ic('swap') + '</button></div></div></div></article>';
        html += '<div class="sides">';
        (d.sides || []).forEach(function (sid) {
          var sr = recipe(sid); if (!sr) return;
          html += '<span class="chip on2">' + esc(sr.name) + '<button data-act="side-rm" data-d="' + i + '" data-id="' + esc(sid) + '" aria-label="Remove ' + esc(sr.name) + '">' + ic('x') + '</button></span>';
        });
        html += '<button class="chip add" data-act="side-add" data-d="' + i + '">' + ic('plus') + ' Side / dessert</button></div>';
      } else {
        html += '<article class="mc empty"><button class="ph-btn" data-act="choose" data-d="' + i + '" aria-label="Choose a dinner"><div class="ph none">' + ic('plus') + '</div></button><div class="mc-b"><button class="mc-t" data-act="choose" data-d="' + i + '">Choose a dinner</button><small>Pick one, or let it surprise you</small><div class="mrow"><span></span><div class="acts"><button class="ico" data-act="dice" data-d="' + i + '" aria-label="Pick at random">' + ic('dice') + '</button></div></div></div></article>';
      }
      html += '</section>';
    }
    html += '</div>';
    if (nDin) {
      html += '<p class="avg">Average per dinner: <b>' + Math.round(cal / nDin) + ' kcal</b> · <b>' + Math.round(prot / nDin) + ' g protein</b> (estimates)</p>';
    }
    html += suggestionsHtml(ws);
    html += '<div class="foot"><button class="btn ghost" data-act="new-week">New week</button><button class="btn ghost" data-act="past-weeks">Past weeks</button></div>';
    return html;
  }
  function suggestionsHtml(ws) {
    var have = {}, used = {};
    shoppingItems(ws).forEach(function (it) { have[it.name.toLowerCase()] = 1; });
    for (var i = 0; i < 7; i++) { var d = getDay(ws, i); if (d.recipeId) used[d.recipeId] = 1; }
    if (!Object.keys(have).length) return '';
    var scored = R().list.filter(function (r) { return r.type === 'Dinner' && !used[r.id]; }).map(function (r) {
      var shared = (r.ingredients || []).filter(function (g) { return have[g.name.toLowerCase()]; });
      return { r: r, n: shared.length, ratio: shared.length / Math.max(1, r.ingredients.length), shared: shared };
    }).filter(function (x) { return x.n >= 4 && x.ratio >= 0.6; }).sort(function (a, b) { return b.ratio - a.ratio; }).slice(0, 3);
    if (!scored.length) return '';
    var h = '<div class="sug"><h3 class="disp">Smart suggestions</h3><p class="muted">Dishes that mostly use what you are already buying.</p>';
    scored.forEach(function (x) {
      h += '<article class="mc"><button class="ph-btn" data-act="open-recipe" data-id="' + esc(x.r.id) + '">' + tile(x.r) + '</button><div class="mc-b"><button class="mc-t" data-act="open-recipe" data-id="' + esc(x.r.id) + '">' + esc(x.r.name) + '</button><small>' + x.n + ' of ' + x.r.ingredients.length + ' ingredients already on your list</small></div></article>';
    });
    return h + '</div>';
  }

  function shopView() {
    var ws = planStart(), items = shoppingItems(ws), ex = extras(ws), html = '';
    var c = listCounts(ws);
    html += '<header class="head"><div><h1 class="disp">Shopping list</h1><small>' + rangeLabel(ws) + ' · ' + c.done + ' of ' + c.total + ' ticked</small></div><button class="ico big" data-act="share-list" aria-label="Share list">' + ic('share') + '</button></header>';
    html += seg('shop');
    html += '<form class="add" id="extra-form" autocomplete="off"><input id="extra-input" placeholder="Add anything, like milk or bin bags" aria-label="Add an item"><button class="btn" type="submit">Add</button></form>';
    if (ex.length) {
      html += '<div class="aisle"><h3 class="disp">Your extras <span>' + ex.filter(function (x) { return x.done; }).length + ' of ' + ex.length + '</span></h3>';
      ex.slice().sort(function (a, b) { return (a.done ? 1 : 0) - (b.done ? 1 : 0) || a.name.localeCompare(b.name); }).forEach(function (x) {
        html += '<div class="it' + (x.done ? ' done' : '') + '"><button class="ck" data-act="extra-tick" data-id="' + esc(x.id) + '" aria-label="Tick ' + esc(x.name) + '">' + (x.done ? ic('check') : '') + '</button><span class="nm">' + esc(x.name) + '<span class="xtra">EXTRA</span></span><button class="ico sm" data-act="extra-del" data-id="' + esc(x.id) + '" aria-label="Remove">' + ic('x') + '</button></div>';
      });
      html += '</div>';
    }
    if (!items.length && !ex.length) {
      html += '<div class="empty-note"><p><b>Nothing on the list yet.</b></p><p class="muted">Pick some dinners on the Week screen and their ingredients will appear here, grouped by aisle.</p><button class="btn dark" data-act="nav" data-v="week">Plan the week</button></div>';
    }
    var aisles = window.DP_AISLES.slice();
    items.forEach(function (it) { if (aisles.indexOf(it.aisle) < 0) aisles.push(it.aisle); });
    aisles.forEach(function (a) {
      var group = items.filter(function (it) { return it.aisle === a; });
      if (!group.length) return;
      group.sort(function (x, y) { return (ticked(ws, x.key) ? 1 : 0) - (ticked(ws, y.key) ? 1 : 0) || x.name.localeCompare(y.name); });
      var done = group.filter(function (g) { return ticked(ws, g.key); }).length;
      html += '<div class="aisle"><h3 class="disp">' + esc(a) + ' <span>' + done + ' of ' + group.length + '</span></h3>';
      group.forEach(function (it) {
        var t = ticked(ws, it.key);
        html += '<div class="it' + (t ? ' done' : '') + '"><button class="ck" data-act="tick" data-key="' + esc(it.key) + '" aria-label="Tick ' + esc(it.name) + '">' + (t ? ic('check') : '') + '</button><span class="nm">' + esc(it.name) + '<small>' + esc(it.meals.join(', ')) + '</small></span><span class="qty">' + esc(fmtQty(it.qty, it.unit)) + '</span></div>';
      });
      html += '</div>';
    });
    return html;
  }

  function filterRecipes(f) {
    var q = (f.q || '').toLowerCase().trim(), st = settings();
    return R().list.filter(function (r) {
      if (f.type && r.type !== f.type) return false;
      if (f.cuisine && r.cuisine !== f.cuisine) return false;
      if (f.flag === 'fav' && !r.fav) return false;
      if (f.flag === 'protein' && !(r.macros && r.macros.protein >= st.proteinTarget)) return false;
      if (f.flag === 'light' && !(r.macros && r.macros.cal && r.macros.cal <= st.calTarget)) return false;
      if (q) {
        var hay = (r.name + ' ' + r.cuisine + ' ' + (r.ingredients || []).map(function (i) { return i.name; }).join(' ')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }
  function recipeRows(list, act) {
    if (!list.length) return '<p class="muted center pad">No recipes match. Try a different filter, or add one.</p>';
    return list.map(function (r) {
      return '<button class="rec" data-act="' + act + '" data-l="' + act + '" data-id="' + esc(r.id) + '">' + tile(r, 'sm') + '<span class="rec-b"><b>' + esc(r.name) + '</b><small>' + esc(r.cuisine) + ' · ' + (r.time || '?') + ' min' + (macroLine(r) ? ' · ' + macroLine(r) : '') + '</small></span>' + (r.fav ? ic('star', 'fav') : '') + '</button>';
    }).join('');
  }
  function chipsHtml(f, withFlags) {
    var st = settings(), h = '<div class="chips">';
    ['Dinner', 'Side', 'Dessert', ''].forEach(function (t) { h += '<button class="chip' + (f.type === t ? ' on' : '') + '" data-f="type" data-v="' + t + '">' + (t || 'All types') + '</button>'; });
    h += '</div><div class="chips scroll"><button class="chip' + (!f.cuisine ? ' on' : '') + '" data-f="cuisine" data-v="">All</button>';
    st.cuisines.forEach(function (c) { h += '<button class="chip' + (f.cuisine === c ? ' on' : '') + '" data-f="cuisine" data-v="' + esc(c) + '">' + esc(c) + '</button>'; });
    h += '</div>';
    if (withFlags) {
      h += '<div class="chips">';
      [['fav', 'Favourites'], ['protein', 'High protein'], ['light', 'Lighter']].forEach(function (x) { h += '<button class="chip' + (f.flag === x[0] ? ' on' : '') + '" data-f="flag" data-v="' + (f.flag === x[0] ? '' : x[0]) + '">' + x[1] + '</button>'; });
      h += '</div>';
    }
    return h;
  }
  function recipesView() {
    var list = filterRecipes(rf);
    return '<header class="head"><div><h1 class="disp">Recipes</h1><small id="rcount">' + R().list.length + ' in the book</small></div><button class="btn sm" data-act="recipe-new">' + ic('plus') + ' Add</button></header>' +
      '<div class="search">' + ic('search') + '<input id="rsearch" type="search" placeholder="Search recipes or ingredients" aria-label="Search" value="' + esc(rf.q) + '"></div>' +
      '<div id="rchips">' + chipsHtml(rf, true) + '</div><div class="recs" id="rlist">' + recipeRows(list, 'open-recipe') + '</div>';
  }

  function render(force) {
    var v = $('#view');
    var ae = document.activeElement;
    // don't wipe the box someone is typing in when a background sync lands
    if (!force && ae && ae.id === 'extra-input' && ae.value) { updateNavOnly(); return; }
    v.innerHTML = view === 'week' ? weekView() : view === 'shop' ? shopView() : recipesView();
    $('#nav').innerHTML = nav();
    window.scrollTo(0, window.__dpScroll || 0);
  }
  function updateNavOnly() { $('#nav').innerHTML = nav(); }

  // ---------- main-view actions ----------
  var A = {};
  A.nav = function (el) {
    var nv = el.getAttribute('data-v'); if (nv === view) return;
    view = nv; try { localStorage.setItem('dp_view', view); } catch (e) { }
    window.__dpScroll = 0; render(); window.scrollTo(0, 0);
  };
  A['shuffle-all'] = function () { doShuffle('all'); };
  A['shuffle-unlocked'] = function () { doShuffle('unlocked'); };
  A.lock = function (el) { var i = +el.dataset.d, ws = planStart(); setDay(ws, i, { locked: !getDay(ws, i).locked }); };
  A.dice = function (el) { rollDay(+el.dataset.d); };
  A.serv = function (el) { var i = +el.dataset.d, ws = planStart(), d = getDay(ws, i), n = Math.max(1, Math.min(12, (d.servings || settings().people) + (+el.dataset.n))); setDay(ws, i, { servings: n }); };
  A['out-clear'] = function (el) { setDay(planStart(), +el.dataset.d, { out: false, label: '' }); };
  A['side-rm'] = function (el) { var ws = planStart(), i = +el.dataset.d, d = getDay(ws, i); setDay(ws, i, { sides: (d.sides || []).filter(function (x) { return x !== el.dataset.id; }) }); };
  A['side-add'] = function (el) { openChooser(+el.dataset.d, 'side'); };
  A.choose = function (el) { openChooser(+el.dataset.d, 'main'); };
  A['open-recipe'] = function (el) { openRecipe(el.dataset.id, el.dataset.d !== undefined && el.dataset.d !== '' ? +el.dataset.d : null); };
  A.tick = function (el) { var ws = planStart(), key = el.dataset.key; S.set('tick:' + ws + ':' + key, { done: !ticked(ws, key) }); };
  A['extra-tick'] = function (el) { var ws = planStart(), id = el.dataset.id, x = S.get('extra:' + ws + ':' + id); if (x) S.set('extra:' + ws + ':' + id, Object.assign({}, x, { done: !x.done })); };
  A['extra-del'] = function (el) { S.del('extra:' + planStart() + ':' + el.dataset.id); };
  A['recipe-new'] = function () { openAddRecipe(); };
  A.settings = function () { openSettings(); };
  A['new-week'] = function () { openNewWeek(); };
  A['past-weeks'] = function () { openPastWeeks(); };
  A['share-list'] = function () {
    var ws = planStart(), lines = ['Shopping list, ' + rangeLabel(ws)];
    var items = shoppingItems(ws), aisles = window.DP_AISLES.slice();
    var ex = extras(ws).filter(function (x) { return !x.done; });
    if (ex.length) { lines.push('', 'Extras'); ex.forEach(function (x) { lines.push('- ' + x.name); }); }
    aisles.forEach(function (a) {
      var g = items.filter(function (i) { return i.aisle === a && !ticked(ws, i.key); });
      if (!g.length) return;
      lines.push('', a); g.forEach(function (i) { lines.push('- ' + i.name + (fmtQty(i.qty, i.unit) ? ' (' + fmtQty(i.qty, i.unit) + ')' : '')); });
    });
    var text = lines.join('\n');
    if (navigator.share) { navigator.share({ text: text }).catch(function () { }); }
    else if (navigator.clipboard) { navigator.clipboard.writeText(text).then(function () { toast('List copied'); }); }
    else toast('Sharing is not available on this device');
  };

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || !t.isConnected || t.closest('.layer')) return;
    var fn = A[t.getAttribute('data-act')];
    if (fn) fn(t, e);
  });
  document.addEventListener('submit', function (e) {
    if (e.target.id === 'extra-form') {
      e.preventDefault();
      var inp = $('#extra-input'), v = inp.value.trim();
      if (!v) return;
      var id = uid(); S.set('extra:' + planStart() + ':' + id, { id: id, name: v, done: false });
      inp.value = '';
      render(true); setTimeout(function () { var i2 = $('#extra-input'); if (i2) i2.focus(); }, 0);
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'rsearch') {
      rf.q = e.target.value;
      $('#rlist').innerHTML = recipeRows(filterRecipes(rf), 'open-recipe');
    }
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-f]');
    if (!t || !t.isConnected || t.closest('.layer')) return;
    rf[t.dataset.f] = t.dataset.v;
    $('#rchips').innerHTML = chipsHtml(rf, true);
    $('#rlist').innerHTML = recipeRows(filterRecipes(rf), 'open-recipe');
  });

  // ---------- chooser (pick a recipe for a day) ----------
  function openChooser(dayIdx, slot) {
    var ws = planStart(), f = { q: '', type: slot === 'side' ? '' : 'Dinner', cuisine: '', flag: '' };
    var node = makeSheet('', 'tall');
    var sheet = $('.sheet', node);
    function paint(keepSearch) {
      var list = filterRecipes(f);
      if (slot === 'side') list = list.filter(function (r) { return r.type === 'Side' || r.type === 'Dessert'; });
      var top = '<div class="sh-h"><h3 class="disp">' + (slot === 'side' ? 'Add to ' : 'Choose for ') + DAYS_LONG[dayIdx] + '</h3><button class="ico" data-l="close" aria-label="Close">' + ic('x') + '</button></div>';
      if (!keepSearch) {
        var body = top;
        if (slot === 'main') {
          body += '<button class="btn dark wide" data-l="surprise">' + ic('dice') + ' Surprise me</button><div class="chips">' + OUT_LABELS.map(function (l) { return '<button class="chip" data-l="out" data-label="' + l + '">' + l + '</button>'; }).join('') + '</div>';
        }
        body += '<div class="search">' + ic('search') + '<input id="ch-search" type="search" placeholder="Search" aria-label="Search recipes" value="' + esc(f.q) + '"></div>';
        body += '<div id="ch-chips">' + (slot === 'side' ? chipsHtmlSide(f) : chipsHtml(f, false)) + '</div><div class="recs" id="ch-list"></div>';
        sheet.innerHTML = body;
      } else { $('#ch-chips', node).innerHTML = slot === 'side' ? chipsHtmlSide(f) : chipsHtml(f, false); }
      $('#ch-list', node).innerHTML = recipeRows(list, 'pick');
    }
    function chipsHtmlSide(ff) {
      var h = '<div class="chips scroll"><button class="chip' + (!ff.type ? ' on' : '') + '" data-f="type" data-v="">All</button><button class="chip' + (ff.type === 'Side' ? ' on' : '') + '" data-f="type" data-v="Side">Sides</button><button class="chip' + (ff.type === 'Dessert' ? ' on' : '') + '" data-f="type" data-v="Dessert">Desserts</button></div>';
      return h;
    }
    paint(false);
    openLayer(node);
    bindLayer(node, {
      pick: function (t) {
        var id = t.dataset.id, d = getDay(ws, dayIdx);
        if (slot === 'side') { setDay(ws, dayIdx, { sides: (d.sides || []).concat([id]) }); toast('Added ' + recipe(id).name); }
        else setDay(ws, dayIdx, { recipeId: id, servings: d.servings || settings().people, out: false, label: '', locked: d.recipeId === id ? d.locked : false, sides: d.recipeId === id ? (d.sides || []) : [] });
        closeLayer(node);
      },
      surprise: function () { closeLayer(node); rollDay(dayIdx); },
      out: function (t) { setDay(ws, dayIdx, { out: true, label: t.dataset.label, recipeId: '', sides: [], locked: false }); closeLayer(node); }
    });
    node.addEventListener('input', function (e) { if (e.target.id === 'ch-search') { f.q = e.target.value; paint(true); } });
    node.addEventListener('click', function (e) {
      var t = e.target.closest('[data-f]'); if (!t) return;
      f[t.dataset.f] = t.dataset.v; paint(true);
    });
  }

  // ---------- recipe page ----------
  function openRecipe(id, dayIdx) {
    var r0 = recipe(id); if (!r0) return;
    var ws = planStart();
    var serv = dayIdx !== null ? (getDay(ws, dayIdx).servings || settings().people) : (r0.serves || 2);
    var node = makePage('');
    function paint() {
      var r = recipe(id); if (!r) { closeLayer(node); return; }
      var scale = serv / (r.serves || 2), m = r.macros || {};
      var h = '<div class="rp-top"><button class="ico big glass" data-l="close" aria-label="Back">' + ic('back') + '</button><button class="ico big glass' + (r.fav ? ' on' : '') + '" data-l="fav" aria-label="Favourite">' + ic('star') + '</button></div>';
      h += '<div class="rp-hero">' + tile(r, 'hero') + '</div><div class="rp-body"><h2 class="disp">' + esc(r.name) + '</h2><p class="muted">' + esc(r.cuisine) + ' · ' + esc(r.type) + ' · ' + (r.time || '?') + ' min · ' + esc(r.difficulty || 'Easy') + '</p>';
      if (m.cal || m.protein || m.carbs || m.fat) {
        h += '<div class="macros"><div><b>' + (m.cal || '-') + '</b><small>kcal</small></div><div><b>' + (m.protein || '-') + 'g</b><small>protein</small></div><div><b>' + (m.carbs || '-') + 'g</b><small>carbs</small></div><div><b>' + (m.fat || '-') + 'g</b><small>fat</small></div></div><p class="tiny muted">Per serving. Estimates only.</p>';
      }
      h += '<div class="serv"><span class="sec">Serves</span><div class="step"><button data-l="sv" data-n="-1" aria-label="Fewer">−</button><b>' + serv + '</b><button data-l="sv" data-n="1" aria-label="More">+</button></div></div>';
      h += '<h3 class="sec">Ingredients</h3><div class="card">' + (r.ingredients || []).map(function (g) {
        var q = (g.qty || 0) * scale, u = normUnit(g.unit), qs = fmtQty(q * u.f, u.unit);
        return '<div><span>' + esc(g.name) + '</span><em>' + esc(qs) + '</em></div>';
      }).join('') + '</div>';
      h += '<h3 class="sec">Method</h3><ol class="method">' + (r.steps || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>';
      h += '<div class="rp-bar"><button class="ico big" data-l="edit" aria-label="Edit recipe">' + ic('edit') + '</button><button class="btn ghost" data-l="addweek">Add to week</button><button class="btn dark" data-l="cook">Start cooking</button></div>';
      node.innerHTML = h;
    }
    paint(); openLayer(node);
    bindLayer(node, {
      fav: function () { var r = deepCopy(recipe(id)); r.fav = !r.fav; saveRecipe(r); paint(); },
      sv: function (t) { serv = Math.max(1, Math.min(12, serv + (+t.dataset.n))); paint(); },
      edit: function () { openEditor(id); },
      cook: function () { openCook(id, serv); },
      addweek: function () { openAddToWeek(id); }
    });
    var unsub = function () { if (node.isConnected) paint(); };
    S.onChange(function (w) { if (w === 'data' && node.isConnected) unsub(); });
  }
  function openAddToWeek(id) {
    var ws = planStart(), r = recipe(id), isMain = r.type === 'Dinner';
    var n = makeSheet('<div class="sh-h"><h3 class="disp">Add to which day?</h3><button class="ico" data-l="close" aria-label="Close">' + ic('x') + '</button></div><div class="days">' + DAYS_LONG.map(function (dn, i) {
      var d = getDay(ws, i), cur = d.recipeId ? recipe(d.recipeId) : null;
      return '<button class="dayrow" data-l="day" data-i="' + i + '"><b>' + dayLabel(ws, i) + '</b><small>' + (d.out ? esc(d.label || 'Takeaway') : cur ? esc(cur.name) : 'Empty') + '</small></button>';
    }).join('') + '</div>');
    openLayer(n);
    bindLayer(n, {
      day: function (t) {
        var i = +t.dataset.i, d = getDay(ws, i);
        if (isMain) setDay(ws, i, { recipeId: id, servings: d.servings || settings().people, out: false, label: '', locked: false, sides: [] });
        else setDay(ws, i, { sides: (d.sides || []).concat([id]) });
        closeLayer(n); toast('Added to ' + DAYS_LONG[i]);
      }
    });
  }

  // ---------- cook mode ----------
  var wake = null;
  function requestWake() { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { wake = l; }).catch(function () { }); } catch (e) { } }
  function releaseWake() { try { if (wake) wake.release(); } catch (e) { } wake = null; }
  function openCook(id, serv) {
    var r = recipe(id), steps = r.steps && r.steps.length ? r.steps : ['No steps saved for this recipe yet.'], i = 0, showAll = false;
    var scale = serv / (r.serves || 2);
    var node = makePage('', 'cookpage');
    function stepIngs(text) {
      var t = text.toLowerCase();
      return (r.ingredients || []).filter(function (g) {
        return g.name.toLowerCase().split(/[\s,()&\/-]+/).some(function (w) { w = w.replace(/s$/, ''); return w.length > 3 && t.indexOf(w) >= 0; });
      });
    }
    function line(g) { var u = normUnit(g.unit); return esc(g.name) + ' ' + esc(fmtQty((g.qty || 0) * scale * u.f, u.unit)); }
    function paint() {
      var ing = showAll ? (r.ingredients || []) : stepIngs(steps[i]);
      var h = '<div class="cook"><div class="ck-top"><button class="ico big dk" data-l="close" aria-label="Close cook mode">' + ic('x') + '</button><span>' + esc(r.name) + '</span></div><div class="prog">' + steps.map(function (_, k) { return '<i class="' + (k <= i ? 'on' : '') + '"></i>'; }).join('') + '</div>';
      h += '<div class="k">Step ' + (i + 1) + ' of ' + steps.length + '</div><p class="big">' + esc(steps[i]) + '</p>';
      if (ing.length || showAll) h += '<div class="need"><b>' + (showAll ? 'All ingredients' : 'You need') + '</b><br>' + ing.map(line).join('<br>') + '</div>';
      h += '<button class="link" data-l="all">' + (showAll ? 'Hide full list' : 'Show all ingredients') + '</button>';
      h += '<div class="cn"><button class="btn dk" data-l="prev"' + (i === 0 ? ' disabled' : '') + '>Back</button>' + (i < steps.length - 1 ? '<button class="btn" data-l="next">Next step</button>' : '<button class="btn" data-l="close">Finish</button>') + '</div></div>';
      node.innerHTML = h;
    }
    paint(); openLayer(node, releaseWake); requestWake();
    document.addEventListener('visibilitychange', function vis() { if (!node.isConnected) { document.removeEventListener('visibilitychange', vis); return; } if (!document.hidden) requestWake(); });
    bindLayer(node, {
      next: function () { if (i < steps.length - 1) { i++; paint(); } },
      prev: function () { if (i > 0) { i--; paint(); } },
      all: function () { showAll = !showAll; paint(); }
    });
  }

  // ---------- recipe editor ----------
  function compress(file, cb, maxPx, q) {
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      var max = maxPx || 900, sc = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); cb(c.toDataURL('image/jpeg', q || 0.72));
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  }
  function openEditor(id, prefill) {
    var isNew = !id, base = id ? deepCopy(recipe(id)) : Object.assign({ id: 'r-' + uid(), name: '', cuisine: settings().cuisines[0] || 'Other', type: 'Dinner', time: 30, difficulty: 'Easy', serves: 2, macros: { cal: '', protein: '', carbs: '', fat: '' }, ingredients: [{ name: '', qty: '', unit: '', aisle: 'Fruit & veg' }], steps: [''], fav: false, photo: '' }, prefill || {});
    if (!base.ingredients || !base.ingredients.length) base.ingredients = [{ name: '', qty: '', unit: '', aisle: 'Fruit & veg' }];
    if (!base.steps || !base.steps.length) base.steps = [''];
    var st = settings(), photo = base.photo || '';
    var node = makePage('');
    function opts(list, sel) { return list.map(function (o) { return '<option' + (o === sel ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join(''); }
    function ingRow(g) {
      return '<div class="ed-ing"><input class="i-q" inputmode="decimal" placeholder="Qty" value="' + esc(g.qty === 0 ? '' : g.qty) + '" aria-label="Quantity"><input class="i-u" placeholder="Unit" value="' + esc(g.unit) + '" aria-label="Unit"><input class="i-n" placeholder="Ingredient" value="' + esc(g.name) + '" aria-label="Ingredient"><select class="i-a" aria-label="Aisle">' + opts(window.DP_AISLES, g.aisle) + '</select><button class="ico sm" data-l="rmi" aria-label="Remove ingredient">' + ic('x') + '</button></div>';
    }
    function stepRow(s) { return '<div class="ed-step"><textarea rows="2" placeholder="Describe this step" aria-label="Step">' + esc(s) + '</textarea><button class="ico sm" data-l="rms" aria-label="Remove step">' + ic('x') + '</button></div>'; }
    var cuisines = st.cuisines.slice(); if (cuisines.indexOf(base.cuisine) < 0) cuisines.push(base.cuisine);
    var types = st.types.slice(); if (types.indexOf(base.type) < 0) types.push(base.type);
    var m = base.macros || {};
    node.innerHTML = '<div class="ed-top"><button class="ico big" data-l="close" aria-label="Cancel">' + ic('back') + '</button><h2 class="disp">' + (isNew ? 'New recipe' : 'Edit recipe') + '</h2><button class="btn sm dark" data-l="save">Save</button></div><div class="ed-body">' +
      '<div class="ed-photo" id="ed-photo">' + '</div><div class="btnrow tight"><button class="btn ghost" data-l="photo">' + ic('camera') + ' Add photo</button><button class="btn ghost" data-l="nophoto">Remove photo</button></div><input type="file" id="ed-file" accept="image/*" hidden>' +
      '<label class="fld">Name<input id="ed-name" value="' + esc(base.name) + '" placeholder="e.g. Chicken tikka masala"></label>' +
      '<div class="two"><label class="fld">Category<select id="ed-cuisine">' + opts(cuisines, base.cuisine) + '<option value="__new">+ New category…</option></select></label><label class="fld">Type<select id="ed-type">' + opts(types, base.type) + '<option value="__new">+ New type…</option></select></label></div>' +
      '<div class="two" id="ed-newrow" hidden><label class="fld">New name<input id="ed-newname" placeholder="Type a name"></label><span></span></div>' +
      '<div class="two"><label class="fld">Time (min)<input id="ed-time" inputmode="numeric" value="' + esc(base.time) + '"></label><label class="fld">Difficulty<select id="ed-diff">' + opts(['Easy', 'Medium', 'Hard'], base.difficulty) + '</select></label></div>' +
      '<label class="fld">Serves (the quantities below are for this many)<input id="ed-serves" inputmode="numeric" value="' + esc(base.serves || 2) + '"></label>' +
      '<div class="sec-row"><h3 class="sec">Macros per serving (optional)</h3><button class="btn ghost sm" data-l="est">Estimate with AI</button></div><div class="four"><label class="fld">kcal<input id="ed-cal" inputmode="numeric" value="' + esc(m.cal) + '"></label><label class="fld">Protein g<input id="ed-pro" inputmode="numeric" value="' + esc(m.protein) + '"></label><label class="fld">Carbs g<input id="ed-carb" inputmode="numeric" value="' + esc(m.carbs) + '"></label><label class="fld">Fat g<input id="ed-fat" inputmode="numeric" value="' + esc(m.fat) + '"></label></div>' +
      '<h3 class="sec">Ingredients</h3><div id="ed-ings">' + base.ingredients.map(ingRow).join('') + '</div><button class="btn ghost" data-l="addi">' + ic('plus') + ' Add ingredient</button>' +
      '<h3 class="sec">Method</h3><div id="ed-steps">' + base.steps.map(stepRow).join('') + '</div><button class="btn ghost" data-l="adds">' + ic('plus') + ' Add step</button>' +
      (isNew ? '' : '<button class="btn danger wide" data-l="del">Delete recipe</button>') + '<div style="height:90px"></div></div>';
    function paintPhoto() { $('#ed-photo', node).innerHTML = photo ? '<img src="' + photo + '" alt="">' : '<div class="ph none big">' + ic('camera') + '</div>'; }
    paintPhoto(); openLayer(node);
    node.addEventListener('change', function (e) {
      if (e.target.id === 'ed-file' && e.target.files[0]) { compress(e.target.files[0], function (d) { if (d) { photo = d; paintPhoto(); } else toast('Could not read that photo'); }); }
      if (e.target.id === 'ed-cuisine' || e.target.id === 'ed-type') {
        var either = $('#ed-cuisine', node).value === '__new' || $('#ed-type', node).value === '__new';
        $('#ed-newrow', node).hidden = !either;
        if (either) { var nm = $('#ed-newname', node); nm.dataset.for = $('#ed-cuisine', node).value === '__new' ? 'cuisine' : 'type'; nm.focus(); }
      }
    });
    function val(sel) { return $(sel, node).value.trim(); }
    function num(sel) { var v = parseFloat(val(sel)); return isFinite(v) ? v : ''; }
    bindLayer(node, {
      est: function (t) {
        if (!DPAI.hasKey()) { toast('Add your API key in Settings first'); openSettings(); return; }
        var ings = [].slice.call(node.querySelectorAll('.ed-ing')).map(function (row) {
          return { name: $('.i-n', row).value.trim(), qty: parseFloat($('.i-q', row).value) || 0, unit: $('.i-u', row).value.trim() };
        }).filter(function (g) { return g.name; });
        if (!ings.length) { toast('Add some ingredients first'); return; }
        var old = t.textContent; t.textContent = 'Estimating\u2026'; t.disabled = true;
        DPAI.macros(val('#ed-name'), num('#ed-serves') || 2, ings).then(function (m) {
          $('#ed-cal', node).value = m.cal; $('#ed-pro', node).value = m.protein; $('#ed-carb', node).value = m.carbs; $('#ed-fat', node).value = m.fat;
          toast('Estimated. Check the numbers look right');
        }).catch(function (e) { toast(DPAI.friendly(e)); }).then(function () { t.textContent = old; t.disabled = false; });
      },
      photo: function () { $('#ed-file', node).click(); },
      nophoto: function () { photo = ''; paintPhoto(); },
      addi: function () { $('#ed-ings', node).insertAdjacentHTML('beforeend', ingRow({ name: '', qty: '', unit: '', aisle: 'Fruit & veg' })); },
      rmi: function (t) { t.closest('.ed-ing').remove(); },
      adds: function () { $('#ed-steps', node).insertAdjacentHTML('beforeend', stepRow('')); },
      rms: function (t) { t.closest('.ed-step').remove(); },
      del: function () {
        confirmSheet({ title: 'Delete this recipe?', text: 'It will be removed from the recipe book. Days already planned with it will show as empty.', ok: 'Delete', danger: true }).then(function (r) {
          if (!r) return;
          saveRecipe({ id: base.id, deleted: true });
          closeLayer(node);
          var top = layers[layers.length - 1]; if (top) closeLayer(top.node);
          toast('Recipe deleted');
        });
      },
      save: function () {
        var name = val('#ed-name'); if (!name) { toast('Give the recipe a name'); $('#ed-name', node).focus(); return; }
        var cuisine = $('#ed-cuisine', node).value, type = $('#ed-type', node).value, newName = val('#ed-newname'), patch = {};
        if (cuisine === '__new' || type === '__new') {
          if (!newName) { toast('Type the new category or type name'); return; }
          if (cuisine === '__new') { cuisine = newName; patch.cuisines = st.cuisines.concat([newName]); }
          else { type = newName; patch.types = st.types.concat([newName]); }
        }
        if (cuisine === '__new') cuisine = 'Other';
        if (st.cuisines.indexOf(cuisine) < 0 && !patch.cuisines) patch.cuisines = st.cuisines.concat([cuisine]);
        if (st.types.indexOf(type) < 0 && !patch.types) patch.types = st.types.concat([type]);
        var ings = [].slice.call(node.querySelectorAll('.ed-ing')).map(function (row) {
          var q = parseFloat($('.i-q', row).value);
          return { name: $('.i-n', row).value.trim(), qty: isFinite(q) ? q : 0, unit: $('.i-u', row).value.trim(), aisle: $('.i-a', row).value };
        }).filter(function (g) { return g.name; });
        var steps = [].slice.call(node.querySelectorAll('.ed-step textarea')).map(function (t) { return t.value.trim(); }).filter(Boolean);
        var rec = Object.assign({}, base, {
          name: name, cuisine: cuisine, type: type, time: num('#ed-time') || 30, difficulty: $('#ed-diff', node).value, serves: num('#ed-serves') || 2,
          macros: { cal: num('#ed-cal'), protein: num('#ed-pro'), carbs: num('#ed-carb'), fat: num('#ed-fat') },
          ingredients: ings, steps: steps.length ? steps : [], photo: photo, starter: false
        });
        if (Object.keys(patch).length) saveSettings(patch);
        saveRecipe(rec);
        closeLayer(node); toast(isNew ? 'Recipe added' : 'Recipe saved');
      }
    });
  }

  // ---------- add a recipe (type it, paste text, or photograph it) ----------
  function openAddRecipe() {
    var ai = DPAI.hasKey(), st = settings();
    var n = makeSheet('');
    var sheet = $('.sheet', n);
    function options(msg) {
      sheet.innerHTML = '<div class="sh-h"><h3 class="disp">Add a recipe</h3><button class="ico" data-l="close" aria-label="Close">' + ic('x') + '</button></div>' +
        (msg ? '<p class="err">' + esc(msg) + '</p>' : '') +
        '<button class="opt" data-l="typed"><b>Type it in</b><small>Fill in the recipe yourself</small></button>' +
        '<button class="opt" data-l="paste"><b>Paste recipe text</b><small>' + (ai ? 'Copy a recipe from a website or message and Claude sets it up' : 'Needs your API key in Settings') + '</small></button>' +
        '<button class="opt" data-l="photo"><b>Photo of a recipe</b><small>' + (ai ? 'Snap a cookbook page or screenshot' : 'Needs your API key in Settings') + '</small></button>' +
        '<input type="file" id="ar-file" accept="image/*" hidden>';
    }
    function busy(text) { sheet.innerHTML = '<div class="busy"><div class="spin"></div><b>' + esc(text) + '</b><small>This can take 10 to 20 seconds.</small></div>'; }
    function done(rec) { closeLayer(n); openEditor(null, rec); toast('Check it over, then tap Save'); }
    function fail(e) { options(DPAI.friendly(e)); }
    function needKey() { closeLayer(n); toast('Add your API key in Settings first'); openSettings(); }
    options(); openLayer(n);
    n.addEventListener('change', function (e) {
      if (e.target.id !== 'ar-file' || !e.target.files[0]) return;
      busy('Reading the recipe…');
      compress(e.target.files[0], function (d) {
        if (!d) { options('Could not read that photo.'); return; }
        DPAI.fromImage(d, window.DP_AISLES, st.cuisines).then(done).catch(fail);
      }, 1600, 0.8);
    });
    bindLayer(n, {
      typed: function () { closeLayer(n); openEditor(null); },
      paste: function () {
        if (!ai) return needKey();
        sheet.innerHTML = '<div class="sh-h"><h3 class="disp">Paste a recipe</h3><button class="ico" data-l="back" aria-label="Back">' + ic('back') + '</button></div><label class="fld">Recipe text<textarea id="ar-text" rows="9" placeholder="Paste the ingredients and method here"></textarea></label><button class="btn dark wide" data-l="go">Create recipe</button>';
        setTimeout(function () { var t = $('#ar-text', n); if (t) t.focus(); }, 50);
      },
      back: function () { options(); },
      go: function () {
        var txt = $('#ar-text', n).value.trim();
        if (txt.length < 30) { toast('Paste a bit more of the recipe'); return; }
        busy('Turning it into a recipe…');
        DPAI.fromText(txt, window.DP_AISLES, st.cuisines).then(done).catch(fail);
      },
      photo: function () { if (!ai) return needKey(); $('#ar-file', n).click(); }
    });
  }

  // ---------- new week / past weeks ----------
  function openNewWeek() {
    var cur = planStart(), next = planBase();
    if (next <= cur) next = addDays(cur, 7);
    var unticked = extras(cur).filter(function (x) { return !x.done; });
    confirmSheet({
      title: 'Start a new week?',
      text: 'This clears the current dinners and shopping list, ready for ' + rangeLabel(next) + '. The old week is saved in Past weeks and your recipes are not touched.',
      extra: unticked.length ? '<label class="chk"><input type="checkbox" name="carry" checked> Keep ' + unticked.length + ' unticked extra' + (unticked.length > 1 ? 's' : '') + ' on the new list</label>' : '',
      ok: 'Start new week'
    }).then(function (res) {
      if (!res) return;
      var pairs = [['plan-meta', { weekStart: next }]];
      if (res.carry) unticked.forEach(function (x) { var id = uid(); pairs.push(['extra:' + next + ':' + id, { id: id, name: x.name, done: false }]); });
      S.setMany(pairs);
      toast('New week started');
    });
  }
  function openPastWeeks() {
    var weeks = pastWeekStarts(), n = makeSheet('', 'tall'), sheet = $('.sheet', n);
    function list() {
      sheet.innerHTML = '<div class="sh-h"><h3 class="disp">Past weeks</h3><button class="ico" data-l="close" aria-label="Close">' + ic('x') + '</button></div>' + (weeks.length ? weeks.map(function (ws) {
        var names = [];
        for (var i = 0; i < 7; i++) { var d = getDay(ws, i); if (d.recipeId && recipe(d.recipeId)) names.push(recipe(d.recipeId).name); }
        return '<button class="dayrow" data-l="week" data-ws="' + ws + '"><b>' + rangeLabel(ws) + '</b><small>' + esc(names.join(', ') || 'No dinners') + '</small></button>';
      }).join('') : '<p class="muted center pad">Finished weeks will show up here after you start a new week.</p>');
    }
    list(); openLayer(n);
    bindLayer(n, {
      week: function (t) {
        var ws = t.dataset.ws, rows = '';
        for (var i = 0; i < 7; i++) { var d = getDay(ws, i), r = d.recipeId ? recipe(d.recipeId) : null; rows += '<div class="dayrow static"><b>' + dayLabel(ws, i) + '</b><small>' + (d.out ? esc(d.label || 'Takeaway') : r ? esc(r.name) : 'Empty') + '</small></div>'; }
        sheet.innerHTML = '<div class="sh-h"><h3 class="disp">' + rangeLabel(ws) + '</h3><button class="ico" data-l="back" aria-label="Back">' + ic('back') + '</button></div>' + rows + '<button class="btn dark wide" data-l="repeat" data-ws="' + ws + '">Use this week again</button>';
      },
      back: list,
      repeat: function (t) {
        var from = t.dataset.ws, cur = planStart();
        confirmSheet({ title: 'Use this week again?', text: 'This replaces the dinners on the current week with these ones.', ok: 'Replace' }).then(function (res) {
          if (!res) return;
          var pairs = [];
          for (var i = 0; i < 7; i++) { var d = deepCopy(getDay(from, i)); d.locked = false; pairs.push([dayKey(cur, i), d]); }
          S.setMany(pairs); closeLayer(n); toast('Week copied');
        });
      }
    });
  }

  // ---------- settings ----------
  function openSettings() {
    var n = makeSheet('', 'tall'), sheet = $('.sheet', n);
    function syncBlock() {
      var h = '<h3 class="sec">Sync between phones</h3>';
      if (!S.syncConfigured()) return h + '<p class="muted">Sync is not switched on yet. Your recipes and plan are saved on this phone only. The README explains how to connect the free database so both phones stay in step.</p>';
      if (!S.code()) return h + '<p class="muted">Start a household on this phone, then join it from your wife’s phone with the invite link.</p><div class="btnrow"><button class="btn dark" data-l="hh-new">Start new household</button><button class="btn ghost" data-l="hh-join">Join with a code</button></div>';
      var st = S.status(), label = { ok: 'Up to date', syncing: 'Syncing…', offline: 'Offline. Changes sync when you are back online', error: 'Could not reach the database. Will keep trying', off: 'Off' }[st];
      return h + '<div class="card pad"><small class="muted">Household code</small><div class="code">' + esc(S.code()) + '</div><p class="muted tiny">' + label + '</p></div><div class="btnrow"><button class="btn dark" data-l="hh-link">Copy invite link</button><button class="btn ghost" data-l="hh-leave">Leave</button></div>';
    }
    function aiBlock() {
      var h = '<h3 class="sec">AI helper (optional)</h3>';
      h += '<p class="muted tiny">Lets you paste a recipe or photograph one, and estimate macros. It uses your own Anthropic API key, saved on this phone only and never synced. Each use costs a few pence at most. Set a spending limit on your Anthropic account.</p>';
      h += '<label class="fld">API key<input id="s-key" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="sk-ant-..." value="' + esc(DPAI.key()) + '"></label>';
      h += '<label class="fld">Model<select id="s-model">' + DPAI.models.map(function (m) { return '<option value="' + m[0] + '"' + (m[0] === DPAI.model() ? ' selected' : '') + '>' + esc(m[1]) + '</option>'; }).join('') + '</select></label>';
      h += '<div class="btnrow"><button class="btn ghost" data-l="ai-test">Test key</button><button class="btn ghost" data-l="ai-clear">Remove key</button></div>';
      return h;
    }
    function paint() {
      var st = settings();
      sheet.innerHTML = '<div class="sh-h"><h3 class="disp">Settings</h3><button class="ico" data-l="close" aria-label="Close">' + ic('x') + '</button></div>' + syncBlock() + aiBlock() +
        '<h3 class="sec">Planning</h3><div class="two"><label class="fld">People (default servings)<input id="s-people" inputmode="numeric" value="' + st.people + '"></label><label class="fld">Avoid repeats for (weeks)<input id="s-avoid" inputmode="numeric" value="' + st.avoidWeeks + '"></label></div>' +
        '<div class="two"><label class="fld">High protein from (g)<input id="s-pro" inputmode="numeric" value="' + st.proteinTarget + '"></label><label class="fld">Lighter up to (kcal)<input id="s-cal" inputmode="numeric" value="' + st.calTarget + '"></label></div>' +
        '<h3 class="sec">Categories</h3><div class="chips wrap">' + st.cuisines.map(function (c) { var used = R().list.some(function (r) { return r.cuisine === c; }); return '<span class="chip on2">' + esc(c) + (used ? '' : '<button data-l="rm-c" data-v="' + esc(c) + '" aria-label="Remove ' + esc(c) + '">' + ic('x') + '</button>') + '</span>'; }).join('') + '</div>' +
        '<form class="add" id="s-addc"><input id="s-newc" placeholder="Add a category, e.g. Greek" aria-label="New category"><button class="btn" type="submit">Add</button></form>' +
        '<h3 class="sec">Recipe types</h3><div class="chips wrap">' + st.types.map(function (c) { var used = R().list.some(function (r) { return r.type === c; }); return '<span class="chip on2">' + esc(c) + (used ? '' : '<button data-l="rm-t" data-v="' + esc(c) + '" aria-label="Remove ' + esc(c) + '">' + ic('x') + '</button>') + '</span>'; }).join('') + '</div>' +
        '<form class="add" id="s-addt"><input id="s-newt" placeholder="Add a type, e.g. Breakfast" aria-label="New type"><button class="btn" type="submit">Add</button></form>' +
        '<p class="muted tiny">A category can only be removed when no recipe uses it. Dinners are what the shuffle picks from.</p><div style="height:20px"></div>';
    }
    paint(); openLayer(n);
    function saveNums() {
      var g = function (id) { var v = parseInt($(id, n).value, 10); return isFinite(v) ? v : null; };
      var p = {}, x;
      if ((x = g('#s-people')) !== null && x > 0) p.people = x;
      if ((x = g('#s-avoid')) !== null && x >= 0) p.avoidWeeks = x;
      if ((x = g('#s-pro')) !== null) p.proteinTarget = x;
      if ((x = g('#s-cal')) !== null) p.calTarget = x;
      saveSettings(p);
    }
    n.addEventListener('change', function (e) {
      if (/^s-(people|avoid|pro|cal)$/.test(e.target.id)) saveNums();
      if (e.target.id === 's-key') { DPAI.setKey(e.target.value.trim()); toast(e.target.value.trim() ? 'Key saved on this phone' : 'Key removed'); }
      if (e.target.id === 's-model') DPAI.setModel(e.target.value);
    });
    n.addEventListener('submit', function (e) {
      e.preventDefault();
      if (e.target.id === 's-addc') { var v = $('#s-newc', n).value.trim(); if (v && settings().cuisines.indexOf(v) < 0) { saveSettings({ cuisines: settings().cuisines.concat([v]) }); paint(); } }
      if (e.target.id === 's-addt') { var v2 = $('#s-newt', n).value.trim(); if (v2 && settings().types.indexOf(v2) < 0) { saveSettings({ types: settings().types.concat([v2]) }); paint(); } }
    });
    var refresh = function (w) { if (n.isConnected && w === 'status') paint(); };
    S.onChange(refresh);
    bindLayer(n, {
      'ai-test': function (t) {
        DPAI.setKey($('#s-key', n).value.trim());
        if (!DPAI.hasKey()) { toast('Paste your API key first'); return; }
        var old = t.textContent; t.textContent = 'Testing\u2026'; t.disabled = true;
        DPAI.test().then(function () { toast('Key works'); }).catch(function (e) { toast(DPAI.friendly(e)); }).then(function () { t.textContent = old; t.disabled = false; });
      },
      'ai-clear': function () { DPAI.setKey(''); $('#s-key', n).value = ''; toast('Key removed from this phone'); },
      'rm-c': function (t) { saveSettings({ cuisines: settings().cuisines.filter(function (c) { return c !== t.dataset.v; }) }); paint(); },
      'rm-t': function (t) { saveSettings({ types: settings().types.filter(function (c) { return c !== t.dataset.v; }) }); paint(); },
      'hh-new': function () { var c = S.newCode(); S.setCode(c); paint(); toast('Household started. Copy the invite link for your wife'); },
      'hh-join': function () {
        var j = makeSheet('<h3 class="disp">Join a household</h3><label class="fld">Code<input id="j-code" placeholder="xxxx-xxxx-xxxx-xxxx" autocapitalize="none" autocomplete="off"></label><div class="btnrow"><button class="btn ghost" data-l="close">Cancel</button><button class="btn dark" data-l="go">Join</button></div>');
        openLayer(j);
        bindLayer(j, { go: function () { var c = $('#j-code', j).value.trim().toLowerCase(); if (c.length < 12) { toast('That code looks too short'); return; } closeLayer(j); S.setCode(c); paint(); toast('Joined. Syncing now'); } });
      },
      'hh-link': function () {
        var url = location.origin + location.pathname + '#join=' + S.code();
        if (navigator.share) navigator.share({ title: 'Dinner Planner', text: 'Open this on your phone to join our dinner planner:', url: url }).catch(function () { });
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Invite link copied'); });
      },
      'hh-leave': function () {
        confirmSheet({ title: 'Leave this household?', text: 'This phone stops syncing. Your data stays on the phone and the other phone keeps working.', ok: 'Leave', danger: true }).then(function (r) { if (r) { S.setCode(''); paint(); } });
      }
    });
  }

  function checkJoinLink() {
    var m = /[#&]join=([a-z0-9-]+)/i.exec(location.hash || '');
    if (!m || !S.syncConfigured()) return;
    var code = m[1].toLowerCase();
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { }
    if (S.code() === code) return;
    confirmSheet({ title: 'Join this household?', text: 'Your phone will sync with the shared dinner planner. Anything already saved on this phone is kept and merged in.', ok: 'Join' }).then(function (r) { if (r) { S.setCode(code); toast('Joined. Syncing now'); } });
  }

  // ---------- boot ----------
  function boot() {
    $('#app').innerHTML = '<main id="view"></main><nav id="nav" aria-label="Main"></nav>';
    S.onChange(function (what) {
      if (what === 'data') { _rc = null; }
      if (what === 'data' || what === 'status') { window.__dpScroll = window.scrollY; render(); }
    });
    render();
    checkJoinLink();
    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(function () { }); }
  }
  S.init().then(boot, boot);
  window.DP = { R: R, planStart: planStart, shoppingItems: shoppingItems, randomise: randomise, getDay: getDay, setDay: setDay, settings: settings };
})();
