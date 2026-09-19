/* Local-first data store with optional Supabase sync (via two secured RPC functions).
   Everything is a "row": key -> JSON value, last-writer-wins by timestamp.
   Works fully offline; if config.js has Supabase details and a household code is set, rows sync between phones. */
(function () {
  var cfg = window.DP_CONFIG || {};
  var rows = {};            // key -> {key, value, ts, dirty}
  var listeners = [];
  var status = 'off';       // off | ok | syncing | offline | error
  var db = null;
  var syncTimer = null, pollTimer = null, syncing = false, again = false;

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { /* storage blocked */ }
    return null;
  }
  var code = ls('dp_code') || '';
  var cursor = parseInt(ls('dp_cursor') || '0', 10) || 0;

  function emit(what) { listeners.forEach(function (fn) { try { fn(what); } catch (e) { console.error(e); } }); }
  function setStatus(s) { if (s !== status) { status = s; emit('status'); } }
  function syncConfigured() { return !!(cfg.url && cfg.anonKey); }
  function syncEnabled() { return syncConfigured() && !!code; }

  // ---------- IndexedDB ----------
  function openDb() {
    return new Promise(function (res) {
      if (!window.indexedDB) return res(null);
      var rq = indexedDB.open('dinner-planner', 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('kv', { keyPath: 'key' }); };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { res(null); };
    });
  }
  function idbAll() {
    return new Promise(function (res) {
      if (!db) return res([]);
      try {
        var rq = db.transaction('kv').objectStore('kv').getAll();
        rq.onsuccess = function () { res(rq.result || []); };
        rq.onerror = function () { res([]); };
      } catch (e) { res([]); }
    });
  }
  function idbPut(list) {
    if (!db || !list.length) return;
    try {
      var tx = db.transaction('kv', 'readwrite'), st = tx.objectStore('kv');
      list.forEach(function (r) { st.put(r); });
    } catch (e) { console.error('save failed', e); }
  }

  function init() {
    return openDb().then(function (d) {
      db = d;
      return idbAll();
    }).then(function (all) {
      all.forEach(function (r) { rows[r.key] = r; });
      if (syncEnabled()) { setStatus('syncing'); startSync(); }
    });
  }

  // ---------- reads / writes ----------
  function get(key) {
    var r = rows[key];
    return r && !(r.value && r.value._del) ? r.value : undefined;
  }
  function list(prefix) {
    var out = [];
    Object.keys(rows).forEach(function (k) {
      if (k.indexOf(prefix) === 0) {
        var r = rows[k];
        if (!(r.value && r.value._del)) out.push({ key: k, value: r.value });
      }
    });
    return out;
  }
  var lastTs = 0;
  function nextTs() { var t = Date.now(); if (t <= lastTs) t = lastTs + 1; lastTs = t; return t; }
  function set(key, value) {
    var r = { key: key, value: value, ts: nextTs(), dirty: 1 };
    rows[key] = r;
    idbPut([r]);
    emit('data');
    scheduleSync(400);
  }
  function del(key) { set(key, { _del: true }); }
  function setMany(pairs) {
    var arr = [];
    pairs.forEach(function (p) {
      var r = { key: p[0], value: p[1], ts: nextTs(), dirty: 1 };
      rows[p[0]] = r; arr.push(r);
    });
    idbPut(arr); emit('data'); scheduleSync(400);
  }

  // ---------- sync ----------
  function rpc(name, args) {
    var headers = { apikey: cfg.anonKey, 'Content-Type': 'application/json' };
    // Legacy "anon" keys are JWTs and go in Authorization too; the newer "publishable" keys are sent as apikey only.
    if (/^eyJ/.test(cfg.anonKey)) headers.Authorization = 'Bearer ' + cfg.anonKey;
    return fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/' + name, {
      method: 'POST', headers: headers, body: JSON.stringify(args)
    }).then(function (r) {
      if (!r.ok) throw new Error('sync ' + r.status);
      return r.text().then(function (t) { return t ? JSON.parse(t) : null; });   // dp_push replies with an empty body
    });
  }
  function scheduleSync(ms) {
    if (!syncEnabled()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncNow, ms || 0);
  }
  function startSync() {
    clearInterval(pollTimer);
    pollTimer = setInterval(function () { if (!document.hidden) syncNow(); }, 5000);
    syncNow();
  }
  function pushDirty() {
    var dirty = Object.keys(rows).filter(function (k) { return rows[k].dirty; }).map(function (k) { return rows[k]; });
    if (!dirty.length) return Promise.resolve();
    var batches = [], cur = [], size = 0;
    dirty.forEach(function (r) {
      var s = JSON.stringify(r.value).length;
      if (cur.length && size + s > 350000) { batches.push(cur); cur = []; size = 0; }
      cur.push(r); size += s;
    });
    if (cur.length) batches.push(cur);
    var p = Promise.resolve();
    batches.forEach(function (b) {
      p = p.then(function () {
        return rpc('dp_push', { h: code, rows: b.map(function (r) { return { key: r.key, value: r.value, ts: r.ts }; }) }).then(function () {
          var done = [];
          b.forEach(function (r) { var cur2 = rows[r.key]; if (cur2 && cur2.ts === r.ts) { cur2.dirty = 0; done.push(cur2); } });
          idbPut(done);
        });
      });
    });
    return p;
  }
  function pull() {
    var changed = false;
    function page() {
      return rpc('dp_pull', { h: code, since: cursor }).then(function (res) {
        var got = (res && res.rows) || [], upd = [];
        got.forEach(function (r) {
          var local = rows[r.key];
          if (!local || r.ts >= local.ts) {
            if (!local || local.ts !== r.ts || local.dirty) {
              rows[r.key] = { key: r.key, value: r.value, ts: r.ts, dirty: 0 };
              upd.push(rows[r.key]); changed = true;
            }
          }
        });
        idbPut(upd);
        if (res && res.max > cursor) { cursor = res.max; ls('dp_cursor', String(cursor)); }
        if (got.length >= 300) return page();
      });
    }
    return page().then(function () { if (changed) emit('data'); });
  }
  function syncNow() {
    if (!syncEnabled()) return Promise.resolve();
    if (syncing) { again = true; return Promise.resolve(); }
    if (navigator.onLine === false) { setStatus('offline'); return Promise.resolve(); }
    syncing = true;
    if (status !== 'ok') setStatus('syncing');
    return pushDirty().then(pull).then(function () { setStatus('ok'); }).catch(function (e) {
      console.warn(e);
      setStatus(navigator.onLine === false ? 'offline' : 'error');
    }).then(function () {
      syncing = false;
      if (again) { again = false; scheduleSync(200); }
    });
  }
  window.addEventListener('online', function () { scheduleSync(100); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) scheduleSync(100); });

  function setCode(c) {
    code = (c || '').trim();
    ls('dp_code', code || null);
    cursor = 0; ls('dp_cursor', '0');
    if (code) {
      // push everything we already have, then pull what the other phone has
      var all = Object.keys(rows).map(function (k) { rows[k].dirty = 1; return rows[k]; });
      idbPut(all);
      setStatus('syncing');
      startSync();
    } else { clearInterval(pollTimer); setStatus('off'); }
    emit('status');
  }
  function newCode() {
    var chars = 'abcdefghjkmnpqrstuvwxyz23456789', a = new Uint8Array(16), s = '';
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < a.length; i++) s += chars[a[i] % chars.length];
    return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12) + '-' + s.slice(12, 16);
  }

  window.DPStore = {
    init: init, get: get, list: list, set: set, del: del, setMany: setMany,
    onChange: function (fn) { listeners.push(fn); },
    status: function () { return status; },
    code: function () { return code; },
    setCode: setCode, newCode: newCode,
    syncConfigured: syncConfigured, syncEnabled: syncEnabled, syncNow: syncNow,
    pendingCount: function () { return Object.keys(rows).filter(function (k) { return rows[k].dirty; }).length; }
  };
})();
