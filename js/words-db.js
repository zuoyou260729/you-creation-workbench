/* ==========================================
   单词模块 - 数据层 / 同步层（纯逻辑，无 UI）
   依赖：SheetJS 全局 XLSX（Excel 解析，可选）
   ========================================== */

(function () {
  'use strict';

  /* ===== IndexedDB 封装 ===== */
  const DB_NAME = 'wb_words_db', VER = 1, STORE = 'words';
  let _db = null;

  function openDB() {
    return new Promise((res, rej) => {
      if (_db) return res(_db);
      const r = indexedDB.open(DB_NAME, VER);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
      };
      r.onsuccess = () => { _db = r.result; res(_db); };
      r.onerror = () => rej(r.error);
    });
  }
  function store(mode) {
    return openDB().then(db => db.transaction(STORE, mode).objectStore(STORE));
  }
  async function dbGetAll() {
    const s = await store('readonly');
    return new Promise((res, rej) => {
      const r = s.getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    });
  }
  async function dbGet(key) {
    const s = await store('readonly');
    return new Promise((res, rej) => {
      const r = s.get(key);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => rej(r.error);
    });
  }
  async function dbPut(w) {
    const s = await store('readwrite');
    return new Promise((res, rej) => {
      const r = s.put(w); r.onsuccess = () => res(); r.onerror = () => rej(r.error);
    });
  }
  async function dbBulk(words) {
    if (!words.length) return;
    const s = await store('readwrite');
    return new Promise((res, rej) => {
      let n = 0;
      words.forEach(w => {
        const r = s.put(w);
        r.onsuccess = () => { if (++n === words.length) res(); };
        r.onerror = () => rej(r.error);
      });
    });
  }
  async function dbDelete(key) {
    const s = await store('readwrite');
    return new Promise((res, rej) => {
      const r = s.delete(key); r.onsuccess = () => res(); r.onerror = () => rej(r.error);
    });
  }

  /* ===== 单词模型 ===== */
  // 英文 key：trim + 转小写 + 去尾部标点（apple. / apple, 归并为 apple）
  function normalizeKey(en) {
    return en.trim().toLowerCase().replace(/[\s]+$/, '').replace(/[.,!?;:'")\]"'』」]+$/g, '');
  }
  // 中文合集去重，以中文逗号连接
  function mergeCn(a, b) {
    const set = new Set();
    [a, b].forEach(src => String(src || '').split(/[,，]/).forEach(x => {
      x = x.trim(); if (x) set.add(x);
    }));
    return [...set].join('，');
  }
  function now() { return Date.now(); }
  function makeWord(en, cn, ipa) {
    const key = normalizeKey(en);
    return { key, en: en.trim(), cn: (cn || '').trim(), ipa: ipa || '',
      weight: 10, masteredCount: 0, mastered: false, isKey: false, lastModified: now() };
  }

  // 解析粘贴文本：按行，行内按 ; ； 切分，每条按 : ： 切分英文/中文
  function parseInput(text) {
    const out = [];
    const lines = String(text || '').split(/\r?\n/);
    for (const line of lines) {
      for (const part of line.split(/[;；]/)) {
        const p = part.trim();
        if (!p) continue;
        const m = p.match(/^(.*?)[:：](.*)$/);
        if (m) {
          const en = m[1].trim(), cn = m[2].trim();
          if (en) out.push({ en, cn: cn || '', ipa: '' });
        }
      }
    }
    return out;
  }

  // 导入并判重合并。返回 {added, merged, dup}
  async function importEntries(entries) {
    const all = await dbGetAll();
    const map = new Map(all.map(w => [w.key, w]));
    let added = 0, merged = 0, dup = 0;
    for (const e of entries) {
      const key = normalizeKey(e.en);
      const cn = e.cn || '';
      if (map.has(key)) {
        const w = map.get(key);
        const before = w.cn;
        const after = mergeCn(before, cn);
        const cnChanged = after !== before;
        const ipaFilled = e.ipa && !w.ipa;
        if (!cnChanged && !ipaFilled) { dup++; continue; }
        if (cnChanged) { w.cn = after; merged++; }
        if (ipaFilled) w.ipa = e.ipa;
        // 展示原式保留首次录入（w.en 不动）
        w.lastModified = now();
        map.set(key, w);
      } else {
        map.set(key, makeWord(e.en, cn, e.ipa));
        added++;
      }
    }
    await dbBulk([...map.values()]);
    return { added, merged, dup };
  }

  // 背诵操作：know 权重-2 掌握进度+1；fuzzy 权重+1；unknown 权重+3 掌握进度归零
  // 权重钳制 [5, 30]；masteredCount>=4 标记已掌握
  async function reviewWord(key, action) {
    const w = await dbGet(key);
    if (!w) return null;
    if (action === 'know') {
      w.weight = Math.max(5, w.weight - 2);
      w.masteredCount = (w.masteredCount || 0) + 1;
    } else if (action === 'fuzzy') {
      w.weight = Math.min(30, w.weight + 1);
      // 模糊：掌握进度不增（半生不熟），但不清零
    } else if (action === 'unknown') {
      w.weight = Math.min(30, w.weight + 3);
      w.masteredCount = 0;
    }
    if ((w.masteredCount || 0) >= 4) w.mastered = true;
    w.lastModified = now();
    await dbPut(w);
    return w;
  }

  async function toggleKey(key) {
    const w = await dbGet(key);
    if (!w) return null;
    w.isKey = !w.isKey;
    w.lastModified = now();
    await dbPut(w);
    return w;
  }
  async function deleteWord(key) { await dbDelete(key); }
  async function updateWord(key, patch) {
    const w = await dbGet(key);
    if (!w) return null;
    Object.assign(w, patch);
    w.lastModified = now();
    await dbPut(w);
    return w;
  }

  // 自动补全音标（Free Dictionary API，返回含 / / 的 IPA；失败返回 ''）
  async function fetchIpa(en) {
    try {
      const key = normalizeKey(en).replace(/[.]/g, '');
      const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`);
      if (!r.ok) return '';
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d && d[0] ? [d[0]] : []);
      for (const e of arr) {
        if (e && e.phonetics) {
          for (const p of e.phonetics) { if (p && p.text) return p.text; }
        }
      }
      return '';
    } catch { return ''; }
  }

  // 解析 Excel/CSV 为条目数组（首行表头，按列：英文|中文|IPA）
  function parseExcel(arrayBuffer) {
    if (typeof XLSX === 'undefined') throw new Error('NO_XLSX');
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length && Array.isArray(rows[0])) rows.shift(); // 去表头
    const out = [];
    for (const row of rows) {
      if (!row || row.length === 0) continue;
      const en = (row[0] != null ? String(row[0]) : '').trim();
      const cn = (row[1] != null ? String(row[1]) : '').trim();
      const ipa = (row[2] != null ? String(row[2]) : '').trim();
      if (en) out.push({ en, cn: cn || '', ipa: ipa || '' });
    }
    return out;
  }

  /* ===== 每日背诵记录（用于次日优先提示） ===== */
  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function recordReview(key) {
    let log = {};
    try { log = JSON.parse(localStorage.getItem('wb_daily_review') || '{}'); } catch {}
    const t = todayKey();
    if (!log[t]) log[t] = [];
    if (!log[t].includes(key)) log[t].push(key);
    localStorage.setItem('wb_daily_review', JSON.stringify(log));
  }
  function getYesterdayReviewed() {
    const log = JSON.parse(localStorage.getItem('wb_daily_review') || '{}');
    const keys = Object.keys(log).sort();
    const yk = keys[keys.length - 2];
    return yk ? log[yk] : [];
  }

  /* ===== GitHub 同步（读取免 Token；写入需 PAT） ===== */
  const REPO = 'zuoyou260729/you-creation-workbench';
  const WORDS_PATH = 'data/words.json';
  function getPat() { return localStorage.getItem('wb_github_pat') || ''; }
  function setPat(t) {
    if (t && t.trim()) localStorage.setItem('wb_github_pat', t.trim());
    else localStorage.removeItem('wb_github_pat');
  }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function deb64(s) { return decodeURIComponent(escape(atob(s))); }

  async function fetchCloud() {
    const url = `https://api.github.com/repos/${REPO}/contents/${WORDS_PATH}`;
    const r = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } });
    if (r.status === 404) return { sha: null, words: [] };
    if (!r.ok) throw new Error('CLOUD_READ_' + r.status);
    const d = await r.json();
    const obj = JSON.parse(deb64(d.content));
    return { sha: d.sha, words: obj.words || [] };
  }
  async function pushCloud(words, sha) {
    const pat = getPat();
    if (!pat) throw new Error('NO_PAT');
    const payload = JSON.stringify({ words, updatedAt: now() });
    const body = { message: 'sync words ' + new Date().toISOString(), content: b64(payload) };
    if (sha) body.sha = sha;
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${WORDS_PATH}`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + pat, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error('PUSH_' + r.status);
    const d = await r.json();
    return d.content.sha;
  }
  function normalizeCloud(cw) {
    return {
      key: cw.key || normalizeKey(cw.en || ''),
      en: (cw.en || '').trim(), cn: (cw.cn || '').trim(), ipa: cw.ipa || '',
      weight: cw.weight == null ? 10 : cw.weight,
      masteredCount: cw.masteredCount || 0, mastered: !!cw.mastered,
      isKey: !!cw.isKey, lastModified: cw.lastModified || now()
    };
  }
  // 从云端拉取并合并进本地（字段级 lastModified 胜出）
  async function syncFromCloud() {
    const { sha, words } = await fetchCloud();
    if (!words.length) return { pulled: 0, sha };
    const local = await dbGetAll();
    const map = new Map(local.map(w => [w.key, w]));
    let pulled = 0;
    for (const cw of words) {
      const key = cw.key || normalizeKey(cw.en || '');
      if (!key) continue;
      const lw = map.get(key);
      const norm = normalizeCloud(cw);
      if (!lw) { map.set(key, norm); pulled++; }
      else if ((cw.lastModified || 0) >= (lw.lastModified || 0)) {
        map.set(key, Object.assign({}, lw, norm, { key })); pulled++;
      }
    }
    await dbBulk([...map.values()]);
    return { pulled, sha };
  }
  // 本地推云端（字段级 lastModified 胜出后整体写回）
  async function syncToCloud() {
    const { sha, words: cloud } = await fetchCloud();
    const cloudMap = new Map();
    cloud.forEach(w => { const k = w.key || normalizeKey(w.en || ''); if (k) cloudMap.set(k, w); });
    const local = await dbGetAll();
    local.forEach(lw => {
      const k = lw.key || normalizeKey(lw.en || '');
      const cw = cloudMap.get(k);
      if (!cw) cloudMap.set(k, lw);
      else if ((lw.lastModified || 0) >= (cw.lastModified || 0)) cloudMap.set(k, lw);
    });
    const merged = [...cloudMap.values()].map(w => ({
      key: w.key || normalizeKey(w.en || ''), en: (w.en || '').trim(), cn: (w.cn || '').trim(),
      ipa: w.ipa || '', weight: w.weight == null ? 10 : w.weight,
      masteredCount: w.masteredCount || 0, mastered: !!w.mastered, isKey: !!w.isKey,
      lastModified: w.lastModified || now()
    }));
    return await pushCloud(merged, sha);
  }

  /* ===== 导出 ===== */
  function exportRows(words) {
    return words.map(w => ({ 英文: w.en, 中文: w.cn, 音标: w.ipa || '', 权重: w.weight, 重点: w.isKey ? '是' : '', 已掌握: w.mastered ? '是' : '' }));
  }

  window.WBWords = {
    dbGetAll, dbGet, dbPut, importEntries, reviewWord, toggleKey, deleteWord, updateWord,
    parseInput, parseExcel, fetchIpa, recordReview, getYesterdayReviewed,
    getAllWords: dbGetAll, syncFromCloud, syncToCloud, getPat, setPat,
    normalizeKey, makeWord, REPO, WORDS_PATH, exportRows
  };
})();
