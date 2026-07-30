/* ==========================================
   单词模块 - UI 层（录入 / 背诵 / 列表）
   依赖：window.WBWords（words-db.js）
   ========================================== */

(function () {
  'use strict';
  const W = window.WBWords;
  if (!W) { console.error('WBWords not loaded'); return; }

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  function showToast(msg) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function speak(text) {
    if (!('speechSynthesis' in window)) { showToast('当前浏览器不支持发音'); return; }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.9;
      const vs = window.speechSynthesis.getVoices();
      const v = vs.find(x => x.lang === 'en-US') || vs.find(x => x.lang && x.lang.startsWith('en'));
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch { showToast('发音调用失败'); }
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }

  // 改动后防抖推云端
  let _pushTimer = null;
  function schedulePush() {
    clearTimeout(_pushTimer);
    _pushTimer = setTimeout(() => {
      W.syncToCloud().then(() => console.log('auto push ok')).catch(e => console.warn('auto push skip', e.message));
    }, 30000);
  }

  /* ==========================================
     页面 A：单词库录入
     ========================================== */
  let pending = []; // {en, cn, ipa}

  function pendingKey(en) { return W.normalizeKey(en); }
  function addPending(en, cn, ipa) {
    en = (en || '').trim(); if (!en) return;
    cn = (cn || '').trim(); ipa = (ipa || '').trim();
    const k = pendingKey(en);
    const ex = pending.find(p => pendingKey(p.en) === k);
    if (ex) {
      // 合并中文（去重逗号连接）+ 补 ipa
      const set = new Set();
      [...ex.cn.split(/[,，]/), ...cn.split(/[,，]/)].forEach(x => { x = x.trim(); if (x) set.add(x); });
      ex.cn = [...set].join('，');
      if (ipa && !ex.ipa) ex.ipa = ipa;
    } else {
      pending.push({ en, cn, ipa });
    }
  }
  function renderPending() {
    const list = $('#wPendingList'); if (!list) return;
    $('#wPendingCount').textContent = pending.length;
    if (!pending.length) { list.innerHTML = '<div class="w-empty">暂无待保存内容</div>'; return; }
    list.innerHTML = pending.map((p, i) => `
      <div class="w-pending-item">
        <div class="w-pi-text"><b>${escapeHtml(p.en)}</b>：${escapeHtml(p.cn)}${p.ipa ? ` <span class="w-pi-ipa">${escapeHtml(p.ipa)}</span>` : ''}</div>
        <button class="w-pi-del" data-i="${i}" aria-label="移除">×</button>
      </div>`).join('');
    $$('.w-pi-del', list).forEach(b => b.addEventListener('click', () => {
      pending.splice(+b.dataset.i, 1); renderPending();
    }));
  }
  async function renderDbList() {
    const list = $('#wDbList'); if (!list) return;
    const words = await W.getAllWords();
    $('#wDbCount').textContent = words.length;
    if (!words.length) { list.innerHTML = '<div class="w-empty">词库为空，去上方录入吧</div>'; return; }
    const sorted = [...words].sort((a, b) => b.lastModified - a.lastModified);
    list.innerHTML = sorted.map(w => `
      <div class="w-db-item" data-key="${escapeHtml(w.key)}">
        <div class="w-db-main">
          <div class="w-db-en">${escapeHtml(w.en)} ${w.isKey ? '<span class="w-star on">★</span>' : ''}</div>
          <div class="w-db-cn" data-edit="cn">${escapeHtml(w.cn) || '<span class="w-muted">点击编辑中文</span>'}</div>
          <div class="w-db-meta">权重 ${w.weight} · ${escapeHtml(w.ipa || '无音标')} · ${w.mastered ? '已掌握' : '学习中'}</div>
        </div>
        <div class="w-db-ops">
          <button class="w-mini" data-act="key" data-key="${escapeHtml(w.key)}">${w.isKey ? '取消重点' : '重点'}</button>
          <button class="w-mini w-del" data-act="del" data-key="${escapeHtml(w.key)}">删除</button>
        </div>
      </div>`).join('');
    $$('.w-db-cn', list).forEach(el => el.addEventListener('click', () => startEditCn(el)));
    $$('.w-mini', list).forEach(b => b.addEventListener('click', async () => {
      const key = b.dataset.key, act = b.dataset.act;
      if (act === 'del') {
        if (!confirm('确定删除该单词？')) return;
        await W.deleteWord(key); showToast('已删除'); renderDbList(); schedulePush();
      } else if (act === 'key') {
        await W.toggleKey(key); renderDbList(); schedulePush();
      }
    }));
  }
  function startEditCn(el) {
    const key = el.closest('.w-db-item').dataset.key;
    const cur = el.textContent.replace('点击编辑中文', '').trim();
    const input = document.createElement('input');
    input.className = 'w-cn-edit'; input.value = cur;
    el.replaceWith(input); input.focus();
    const save = async () => {
      const v = input.value.trim();
      await W.updateWord(key, { cn: v });
      renderDbList(); schedulePush();
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
  }

  function downloadDb(words, base) {
    const rows = W.exportRows(words);
    const name = `${base}---${todayStr()}`;
    if (typeof XLSX !== 'undefined') {
      try {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'words');
        XLSX.writeFile(wb, name + '.xlsx');
        return;
      } catch (e) { console.warn('xlsx export fail', e); }
    }
    // 降级 CSV
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => `"${String(r[h] == null ? '' : r[h]).replace(/"/g, '""')}"`).join(','))).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.csv'; a.click();
  }

  async function doSync(pushAlso) {
    try {
      const r = await W.syncFromCloud();
      showToast(`已从云端拉取 ${r.pulled} 条`);
      await renderDbList();
      if (pushAlso) {
        if (!W.getPat()) {
          const t = prompt('请输入 GitHub Token(PAT) 以启用上传同步。\n仅保存在本机浏览器，不上传任何服务器。可在 GitHub → Settings → Developer settings 生成（勾 repo）。留空则仅本地可用：');
          if (t) W.setPat(t);
        }
        if (W.getPat()) {
          await W.syncToCloud();
          showToast('已同步到云端');
        } else {
          showToast('未设置 Token，仅本地/拉取可用');
        }
      }
    } catch (e) {
      showToast('同步失败：' + e.message);
    }
  }

  function initWordInput() {
    const ta = $('#wTextInput'), fileInput = $('#wFileInput');
    $('#wAddOne').addEventListener('click', () => {
      const en = $('#wEnInput').value, cn = $('#wCnInput').value, ipa = $('#wIpaInput').value;
      if (!en.trim()) { showToast('请输入英文'); return; }
      addPending(en, cn, ipa);
      $('#wEnInput').value = ''; $('#wCnInput').value = ''; $('#wIpaInput').value = '';
      renderPending();
    });
    $('#wClearInput').addEventListener('click', () => { ta.value = ''; });
    $('#wClearPending').addEventListener('click', () => { pending = []; renderPending(); });
    $('#wLoadSample').addEventListener('click', () => {
      ['apple:苹果', 'banana:香蕉；orange:橙子', 'computer:电脑', 'happy:快乐的;高兴的'].forEach(s => {
        W.parseInput(s).forEach(e => addPending(e.en, e.cn, e.ipa));
      });
      renderPending(); showToast('已载入示例');
    });
    fileInput.addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (typeof XLSX === 'undefined') { showToast('Excel 解析库未加载，请联网后重试或使用文本粘贴/CSV'); fileInput.value = ''; return; }
      try {
        const buf = await f.arrayBuffer();
        const rows = W.parseExcel(buf);
        rows.forEach(r => addPending(r.en, r.cn, r.ipa));
        renderPending();
        showToast(`已从文件导入 ${rows.length} 条`);
      } catch (err) { showToast('解析失败：' + err.message); }
      fileInput.value = '';
    });
    $('#wSaveBtn').addEventListener('click', async () => {
      // 文本区也并入 pending
      const txt = ta.value;
      if (txt.trim()) { W.parseInput(txt).forEach(e => addPending(e.en, e.cn, e.ipa)); ta.value = ''; }
      if (!pending.length) { showToast('没有可保存的内容'); return; }
      // 自动补全音标（空 ipa 的条目）
      showToast('保存中，正在补全音标…');
      await Promise.all(pending.map(async p => {
        if (!p.ipa) { p.ipa = await W.fetchIpa(p.en); }
      }));
      const res = await W.importEntries(pending);
      pending = [];
      renderPending();
      await renderDbList();
      schedulePush();
      showToast(`保存完成：新增 ${res.added} · 合并 ${res.merged} · 重复丢弃 ${res.dup}`);
    });
    $('#wDownloadDb').addEventListener('click', async () => downloadDb(await W.getAllWords(), '所有单词库'));
    $('#wDownloadDb2').addEventListener('click', async () => downloadDb(await W.getAllWords(), '所有单词库'));
    $('#wSyncBtn').addEventListener('click', () => doSync(true));
    renderPending();
    renderDbList();
    // 打开录入页时静默从云端拉取一次（联网则更新本地）
    W.syncFromCloud().then(r => { if (r.pulled) renderDbList(); }).catch(() => {});
  }

  /* ==========================================
     页面 B：单词背诵
     ========================================== */
  let R = { queue: [], idx: 0, viewStack: [], curKey: null };
  let reviewWordsCache = [];

  function saveSession() {
    localStorage.setItem('wb_review_session', JSON.stringify({
      today: todayStr(), queue: R.queue, idx: R.idx, viewStack: R.viewStack
    }));
  }
  function buildQueue(words) {
    const avail = words.filter(w => !w.mastered);
    const high = avail.filter(w => w.weight >= 10);
    const low = avail.filter(w => w.weight >= 5 && w.weight < 10);
    const total = avail.length;
    const lowRatio = total > 0 ? Math.min(0.15 + (low.length / total) * 0.3, 0.4) : 0;
    const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
    shuf(high); shuf(low);
    const q = []; let hi = 0, li = 0;
    while (hi < high.length || li < low.length) {
      const pickLow = li < low.length && (hi >= high.length || Math.random() < lowRatio);
      if (pickLow) q.push(low[li++].key);
      else if (hi < high.length) q.push(high[hi++].key);
      else if (li < low.length) q.push(low[li++].key);
    }
    return q;
  }
  function yesterdayFront(words, queue) {
    const yest = W.getYesterdayReviewed();
    if (!yest.length) return [];
    const set = new Set(queue);
    const sampled = [...new Set(yest)].sort(() => Math.random() - 0.5).slice(0, Math.ceil(yest.length * 0.3));
    return sampled.filter(k => set.has(k));
  }
  async function ensureSession() {
    const s = JSON.parse(localStorage.getItem('wb_review_session') || '{}');
    reviewWordsCache = await W.getAllWords();
    if (s.today === todayStr() && s.queue && s.queue.length) {
      R.queue = s.queue; R.idx = s.idx || 0; R.viewStack = s.viewStack || [];
    } else {
      const q = buildQueue(reviewWordsCache);
      const front = yesterdayFront(reviewWordsCache, q);
      R.queue = front.concat(q.filter(k => !front.includes(k)));
      R.idx = 0; R.viewStack = [];
    }
    saveSession();
  }
  function updateReviewStat() {
    const total = reviewWordsCache.length;
    const unmastered = reviewWordsCache.filter(w => !w.mastered).length;
    $('#wReviewStat').textContent = `词库 ${total} 词 · 待掌握 ${unmastered} · 本轮第 ${Math.min(R.idx + 1, R.queue.length)}/${R.queue.length} 个`;
  }
  async function showCurrent(autoPush) {
    const key = R.queue[R.idx];
    if (!key) { $('#wWordEn').textContent = '🎉 本轮已背完'; $('#wWordIpa').textContent = ''; $('#wMeaning').style.display = 'none'; $('#wShowMeaning').style.display = 'none'; return; }
    const w = await W.dbGet(key);
    if (!w) { R.idx++; if (R.idx < R.queue.length) return showCurrent(); else { $('#wWordEn').textContent = '🎉 本轮已背完'; return; } }
    R.curKey = key;
    $('#wWordEn').textContent = w.en;
    $('#wWordIpa').textContent = w.ipa || '';
    $('#wMeaning').style.display = 'none';
    $('#wMeaning').textContent = w.cn;
    $('#wShowMeaning').style.display = 'inline-flex';
    $('#wKeyMark').classList.toggle('on', !!w.isKey);
    updateReviewStat();
    if (autoPush) saveSession();
  }
  function pushView(key) { if (R.viewStack[R.viewStack.length - 1] !== key) R.viewStack.push(key); }
  async function goNext() {
    pushView(R.curKey);
    R.idx++;
    if (R.idx >= R.queue.length) {
      // 本轮结束，基于最新权重重建队列
      reviewWordsCache = await W.getAllWords();
      const q = buildQueue(reviewWordsCache);
      if (!q.length) { R.queue = []; R.idx = 0; showCurrent(); return; }
      R.queue = q; R.idx = 0;
    }
    await showCurrent(true);
  }
  function goPrev() {
    if (R.viewStack.length <= 1) { showToast('已经是第一个'); return; }
    R.viewStack.pop();
    const k = R.viewStack[R.viewStack.length - 1];
    R.curKey = k;
    const i = R.queue.indexOf(k);
    if (i >= 0) R.idx = i;
    // 直接显示历史，不 push
    (async () => {
      const w = await W.dbGet(k);
      if (w) {
        $('#wWordEn').textContent = w.en; $('#wWordIpa').textContent = w.ipa || '';
        $('#wMeaning').style.display = 'none'; $('#wMeaning').textContent = w.cn;
        $('#wShowMeaning').style.display = 'inline-flex';
        $('#wKeyMark').classList.toggle('on', !!w.isKey);
      }
    })();
  }
  async function doReview(action) {
    if (!R.curKey) return;
    await W.reviewWord(R.curKey, action);
    W.recordReview(R.curKey);
    reviewWordsCache = await W.getAllWords();
    if (action === 'fuzzy' || action === 'unknown') {
      $('#wMeaning').style.display = 'block';
    }
    schedulePush();
    if (action === 'know') { await goNext(); }
    else { updateReviewStat(); }
  }
  function initWordReview() {
    $('#wSpeakBtn').addEventListener('click', () => { const t = $('#wWordEn').textContent; if (t) speak(t); });
    $('#wShowMeaning').addEventListener('click', () => { $('#wMeaning').style.display = 'block'; });
    $('#wKnowBtn').addEventListener('click', () => doReview('know'));
    $('#wFuzzyBtn').addEventListener('click', () => doReview('fuzzy'));
    $('#wUnknownBtn').addEventListener('click', () => doReview('unknown'));
    $('#wNextBtn').addEventListener('click', () => goNext());
    $('#wPrevWord').addEventListener('click', () => goPrev());
    $('#wKeyMark').addEventListener('click', async () => {
      if (!R.curKey) return;
      const w = await W.toggleKey(R.curKey);
      if (w) { $('#wKeyMark').classList.toggle('on', w.isKey); showToast(w.isKey ? '已标记重点' : '已取消重点'); schedulePush(); }
    });
  }

  /* ==========================================
     页面 C：词库列表
     ========================================== */
  let listTab = 'all', listTerm = '', listPage = 0;
  const PAGE = 30;
  let _searchTimer = null;

  async function renderList() {
    const all = await W.getAllWords();
    let arr = all;
    if (listTab === 'key') arr = arr.filter(w => w.isKey);
    if (listTerm) {
      const t = listTerm.toLowerCase();
      arr = arr.filter(w => (w.en || '').toLowerCase().includes(t) || (w.cn || '').toLowerCase().includes(t));
    }
    arr.sort((a, b) => b.lastModified - a.lastModified);
    $('#wListTotal').textContent = all.length;
    const totalPages = Math.max(1, Math.ceil(arr.length / PAGE));
    if (listPage >= totalPages) listPage = totalPages - 1;
    if (listPage < 0) listPage = 0;
    const slice = arr.slice(listPage * PAGE, listPage * PAGE + PAGE);
    const list = $('#wList');
    if (!slice.length) { list.innerHTML = '<div class="w-empty">没有匹配的单词</div>'; $('#wPager').innerHTML = ''; return; }
    list.innerHTML = slice.map(w => `
      <div class="w-list-item">
        <div class="w-li-en">${escapeHtml(w.en)} ${w.isKey ? '<span class="w-star on">★</span>' : ''} ${w.mastered ? '<span class="w-mastered">已掌握</span>' : ''}</div>
        <div class="w-li-cn">${escapeHtml(w.cn)}</div>
        <div class="w-li-meta">权重 ${w.weight}${w.ipa ? ' · ' + escapeHtml(w.ipa) : ''}</div>
      </div>`).join('');
    const pager = $('#wPager');
    pager.innerHTML = `
      <button class="w-pg" data-pg="prev" ${listPage === 0 ? 'disabled' : ''}>上一页</button>
      <span class="w-pg-info">${listPage + 1} / ${totalPages}</span>
      <button class="w-pg" data-pg="next" ${listPage >= totalPages - 1 ? 'disabled' : ''}>下一页</button>`;
    $$('.w-pg', pager).forEach(b => b.addEventListener('click', () => {
      if (b.dataset.pg === 'prev') listPage--;
      else listPage++;
      renderList();
    }));
  }
  function initWordList() {
    $$('.w-tab').forEach(tab => tab.addEventListener('click', () => {
      $$('.w-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      listTab = tab.dataset.tab; listPage = 0; renderList();
    }));
    $('#wSearchInput').addEventListener('input', e => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => { listTerm = e.target.value.trim(); listPage = 0; renderList(); }, 300);
    });
    $('#wListDownload').addEventListener('click', async () => {
      let arr = await W.getAllWords();
      if (listTab === 'key') arr = arr.filter(w => w.isKey);
      if (listTerm) { const t = listTerm.toLowerCase(); arr = arr.filter(w => (w.en || '').toLowerCase().includes(t) || (w.cn || '').toLowerCase().includes(t)); }
      downloadDb(arr, listTab === 'key' ? '重点单词库' : '所有单词库');
    });
    renderList();
  }

  /* ===== 初始化 ===== */
  function boot() {
    initWordInput();
    initWordReview();
    initWordList();
    // 进入对应页时按需刷新
    $$('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const p = item.dataset.page;
        if (p === 'word-input') { renderDbList(); }
        else if (p === 'word-review') { ensureSession().then(() => showCurrent(false)); }
        else if (p === 'word-list') { renderList(); }
      });
    });
  }

  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
