/* ==========================================
   自媒体创作工作台 - 核心逻辑
   ========================================== */

(function () {
  'use strict';

  /* ===== 工具函数 ===== */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function showToast(msg) {
    const toast = $('#toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatDateCN(date) {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const d = new Date(date);
    return `${d.getMonth() + 1}月${d.getDate()}日 周${days[d.getDay()]}`;
  }

  function loadData(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  /* ===== 页面导航 ===== */
  function initNavigation() {
    $$('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        $$('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        $$('.page').forEach(p => p.classList.remove('active'));
        $(`#page-${page}`).classList.add('active');
        $('.main').scrollTop = 0;
      });
    });
  }

  /* ===== 时钟 ===== */
  function initClock() {
    function update() {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const el = $('#currentTime');
      if (el) el.textContent = `${h}:${m}`;
    }
    update();
    setInterval(update, 30000);
  }

  /* ==========================================
     页面1: 每日计划
     ========================================== */
  const TASK_KEY = 'wb_tasks';
  const TASK_DONE_KEY = 'wb_tasks_done';

  function getDefaultTasks() {
    return [
      { id: 't_exercise', name: '运动', time: '10:50' },
      { id: 't_sleep', name: '提醒睡觉', time: '23:00' }
    ];
  }

  function getTasks() {
    return loadData(TASK_KEY, getDefaultTasks());
  }

  function getDoneTasks() {
    const key = `${TASK_DONE_KEY}_${todayKey()}`;
    return loadData(key, []);
  }

  function saveTasks(tasks) {
    saveData(TASK_KEY, tasks);
  }

  function saveDoneTasks(done) {
    const key = `${TASK_DONE_KEY}_${todayKey()}`;
    saveData(key, done);
  }

  function renderTasks() {
    const tasks = getTasks();
    const done = getDoneTasks();
    const list = $('#taskList');
    const empty = $('#taskEmpty');

    if (tasks.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      list.innerHTML = tasks.map(task => {
        const isDone = done.includes(task.id);
        return `
          <div class="task-item ${isDone ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-checkbox ${isDone ? 'checked' : ''}" data-id="${task.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div class="task-content">
              <div class="task-name">${escapeHtml(task.name)}</div>
              <span class="task-time">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                ${task.time}
              </span>
            </div>
            <button class="task-delete" data-id="${task.id}" aria-label="删除任务">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        `;
      }).join('');
    }

    // 绑定事件
    $$('.task-checkbox', list).forEach(cb => {
      cb.addEventListener('click', () => toggleTask(cb.dataset.id));
    });
    $$('.task-delete', list).forEach(btn => {
      btn.addEventListener('click', () => deleteTask(btn.dataset.id));
    });

    updateProgress();
  }

  function toggleTask(id) {
    let done = getDoneTasks();
    if (done.includes(id)) {
      done = done.filter(d => d !== id);
    } else {
      done.push(id);
      showToast('已完成，继续保持');
    }
    saveDoneTasks(done);
    renderTasks();
  }

  function deleteTask(id) {
    let tasks = getTasks();
    tasks = tasks.filter(t => t.id !== id);
    saveTasks(tasks);
    let done = getDoneTasks().filter(d => d !== id);
    saveDoneTasks(done);
    renderTasks();
    showToast('已删除');
  }

  function addTask() {
    const input = $('#taskInput');
    const timeInput = $('#taskTimeInput');
    const name = input.value.trim();
    if (!name) {
      showToast('请输入任务名称');
      return;
    }
    const tasks = getTasks();
    const id = 't_' + Date.now();
    tasks.push({ id, name, time: timeInput.value || '09:00' });
    saveTasks(tasks);
    input.value = '';
    timeInput.value = '09:00';
    renderTasks();
    showToast('任务已添加');
  }

  function updateProgress() {
    const tasks = getTasks();
    const done = getDoneTasks();
    const total = tasks.length;
    const completed = done.filter(d => tasks.some(t => t.id === d)).length;
    const ring = $('#progressRingFg');
    const text = $('#progressText');
    const circumference = 2 * Math.PI * 24; // ≈150.8
    const percent = total > 0 ? completed / total : 0;
    ring.style.strokeDashoffset = circumference * (1 - percent);
    text.textContent = `${completed}/${total}`;
  }

  function initDailyPlan() {
    $('#todayDate').textContent = formatDateCN(new Date());
    $('#taskAddBtn').addEventListener('click', addTask);
    $('#taskInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') addTask();
    });
    renderTasks();
  }

  /* ==========================================
     页面2: 选题灵感
     ========================================== */
  let currentPlatform = 'douyin';

  function initTopicInspiration() {
    $$('.platform-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.platform-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentPlatform = tab.dataset.platform;
        loadTopicData();
      });
    });
    $('#topicRefreshBtn').addEventListener('click', loadTopicData);
    loadTopicData();
  }

  async function loadTopicData() {
    const list = $('#topicList');
    const empty = $('#topicEmpty');
    const dateLabel = $('#topicDataDate');

    // 显示骨架屏
    empty.style.display = 'none';
    list.innerHTML = Array(3).fill(0).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-line" style="width:80%"></div>
        <div class="skeleton-line" style="width:50%"></div>
        <div class="skeleton-line" style="width:90%"></div>
        <div class="skeleton-line" style="width:70%"></div>
      </div>
    `).join('');

    try {
      const resp = await fetch(`data/topic-${currentPlatform}.json?t=${Date.now()}`);
      if (!resp.ok) throw new Error('not found');
      const data = await resp.json();
      renderTopicCards(data);
      dateLabel.textContent = `更新于 ${data.date || '今日'}`;
    } catch {
      const emb = EMBEDDED[currentPlatform];
      if (emb && emb.length) {
        renderTopicCards({ videos: emb });
        dateLabel.textContent = '内置示例 · 联网后自动更新';
      } else {
        list.innerHTML = '';
        empty.style.display = 'block';
        dateLabel.textContent = '暂无数据';
      }
    }
  }

  function renderTopicCards(data) {
    const list = $('#topicList');
    const videos = data.videos || [];
    if (videos.length === 0) {
      list.innerHTML = '';
      $('#topicEmpty').style.display = 'block';
      return;
    }
    list.innerHTML = videos.map(v => `
      <div class="inspire-card">
        <div class="card-top">
          <div class="card-title">${escapeHtml(v.title)}</div>
          <span class="card-platform ${currentPlatform}">${PLATFORM_NAME[currentPlatform] || currentPlatform}</span>
        </div>
        <div class="card-meta">
          ${v.author ? `<span class="card-meta-item">@${escapeHtml(v.author)}</span>` : ''}
          ${v.plays ? `<span class="card-meta-item">${escapeHtml(v.plays)}</span>` : ''}
          ${v.likes ? `<span class="card-meta-item">${escapeHtml(v.likes)} 赞</span>` : ''}
        </div>
        <div class="card-section">
          <div class="card-section-label hot">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
            爆火核心原因
          </div>
          <div class="card-section-text">${escapeHtml(v.analysis)}</div>
        </div>
        <div class="card-section">
          <div class="card-section-label idea">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>
            原创创作思路
          </div>
          <div class="card-section-text">${escapeHtml(v.creationIdeas)}</div>
        </div>
          ${v.url ? `<a href="${escapeAttr(v.url)}" target="_blank" rel="noopener" class="card-link">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
          ${getLinkLabel(v.url)}
        </a>` : ''}
      </div>
    `).join('');
  }

  /* ==========================================
     页面3: 爆款热点视频/二创
     ========================================== */
  function initHotVideos() {
    $('#hotRefreshBtn').addEventListener('click', loadHotData);
    loadHotData();
  }

  async function loadHotData() {
    const list = $('#hotList');
    const empty = $('#hotEmpty');
    const dateLabel = $('#hotDataDate');

    empty.style.display = 'none';
    list.innerHTML = Array(3).fill(0).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-line" style="width:75%"></div>
        <div class="skeleton-line" style="width:55%"></div>
        <div class="skeleton-line" style="width:90%"></div>
        <div class="skeleton-line" style="width:65%"></div>
      </div>
    `).join('');

    try {
      const resp = await fetch(`data/hot-videos.json?t=${Date.now()}`);
      if (!resp.ok) throw new Error('not found');
      const data = await resp.json();
      renderHotCards(data);
      dateLabel.textContent = `更新于 ${data.date || '今日'}`;
    } catch {
      const emb = EMBEDDED.hot;
      if (emb && emb.length) {
        renderHotCards({ items: emb });
        dateLabel.textContent = '内置示例 · 联网后自动更新';
      } else {
        list.innerHTML = '';
        empty.style.display = 'block';
        dateLabel.textContent = '暂无数据';
      }
    }
  }

  function renderHotCards(data) {
    const list = $('#hotList');
    const items = data.items || [];
    if (items.length === 0) {
      list.innerHTML = '';
      $('#hotEmpty').style.display = 'block';
      return;
    }
    list.innerHTML = items.map(v => `
      <div class="inspire-card">
        <div class="card-top">
          <div class="card-title">${escapeHtml(v.title)}</div>
          ${v.source ? `<span class="card-platform ${getSourceClass(v.source)}">${escapeHtml(v.source)}</span>` : ''}
        </div>
        ${v.plays ? `<div class="card-meta"><span class="card-meta-item">${escapeHtml(v.plays)}</span></div>` : ''}
        <div class="card-section">
          <div class="card-section-label hot">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
            热点概览
          </div>
          <div class="card-section-text">${escapeHtml(v.trending || v.analysis || '')}</div>
        </div>
        <div class="card-section">
          <div class="card-section-label recreation">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            二创改编方案
          </div>
          <div class="card-section-text">${escapeHtml(v.recreationPlan)}</div>
        </div>
          ${v.url ? `<a href="${escapeAttr(v.url)}" target="_blank" rel="noopener" class="card-link">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
          ${getLinkLabel(v.url)}
        </a>` : ''}
      </div>
    `).join('');
  }

  /* ==========================================
     页面4: 内容复盘
     ========================================== */
  const REVIEW_KEY = 'wb_reviews';

  function initContentReview() {
    $('#reviewForm').addEventListener('submit', e => {
      e.preventDefault();
      handleReviewSubmit();
    });
    renderHistory();
  }

  function handleReviewSubmit() {
    const plays = parseInt($('#rPlays').value) || 0;
    const likes = parseInt($('#rLikes').value) || 0;
    const comments = parseInt($('#rComments').value) || 0;
    const shares = parseInt($('#rShares').value) || 0;
    const completion = parseFloat($('#rCompletion').value) || 0;
    const traffic = $('#rTraffic').value;
    const title = $('#rTitle').value.trim() || '未命名作品';

    const result = analyzeContent({ plays, likes, comments, shares, completion, traffic });
    renderAnalysis(result, { plays, likes, comments, shares, completion, traffic, title });
    saveReview({ plays, likes, comments, shares, completion, traffic, title, result, date: new Date().toISOString() });
    renderHistory();
    showToast('诊断报告已生成');
  }

  function analyzeContent(data) {
    const { plays, likes, comments, shares, completion, traffic } = data;
    const issues = [];
    const suggestions = [];
    const strengths = [];

    const likeRate = plays > 0 ? (likes / plays * 100) : 0;
    const commentRate = plays > 0 ? (comments / plays * 100) : 0;
    const shareRate = plays > 0 ? (shares / plays * 100) : 0;

    // ===== 完播率分析 =====
    if (completion < 15) {
      issues.push('完播率严重偏低');
      suggestions.push('前3秒缺乏吸引力 — 优化开头钩子，用悬念/冲突/反转在第一帧就抓住注意力，例如直接展示改造前后对比');
      suggestions.push('视频节奏拖沓 — 精简冗余内容，前15秒每3秒一个信息点，加快剪辑节奏');
      suggestions.push('考虑缩短视频时长 — 30秒以内的短视频完播率天然更高');
    } else if (completion < 30) {
      issues.push('完播率有提升空间');
      suggestions.push('中段内容流失 — 在视频1/3处设置小高潮或反转，保持观众期待');
      suggestions.push('结尾缺乏留人点 — 在结尾预告下期内容或设置彩蛋，引导看完');
    } else if (completion >= 45) {
      strengths.push('完播率优秀，内容节奏把控好');
    }

    // ===== 点赞率分析 =====
    if (likeRate < 1) {
      issues.push('点赞率偏低');
      suggestions.push('内容情感共鸣不足 — 增加能引发共鸣的场景，如租房痛点、预算限制等真实感细节');
      suggestions.push('缺少价值交付 — 确保每条视频有明确的干货清单或情绪价值，让观众觉得"值得收藏"');
    } else if (likeRate < 3) {
      issues.push('点赞率一般');
      suggestions.push('结尾缺少引导 — 在视频结尾自然引导点赞，如"觉得有用的话点个赞支持一下"');
    } else if (likeRate >= 5) {
      strengths.push('点赞率优秀，内容价值感强');
    }

    // ===== 评论率分析 =====
    if (commentRate < 0.1) {
      issues.push('评论互动不足');
      suggestions.push('缺少互动钩子 — 在视频中抛出争议性观点或提问，如"你们觉得花2000值吗？"激发讨论');
      suggestions.push('主动回复评论 — 发布后1小时内积极回复前20条评论，推高互动权重');
    } else if (commentRate < 0.5) {
      issues.push('评论率有提升空间');
      suggestions.push('设置话题争议点 — 在内容中刻意留一个"可讨论"的点，如某种装修风格的选择');
    } else if (commentRate >= 1) {
      strengths.push('评论互动活跃，话题设置到位');
    }

    // ===== 转发率分析 =====
    if (shareRate < 0.1) {
      issues.push('转发率偏低');
      suggestions.push('内容社交属性弱 — 增加实用干货或情感价值，让用户有分享给朋友的动机');
      suggestions.push('增加"艾特好友"引导 — 如"艾特你那个要装修的朋友来看"');
    } else if (shareRate < 0.5) {
      issues.push('转发率有提升空间');
      suggestions.push('提升内容实用度 — 干货清单类内容天然转发率更高，尝试做"装修避坑清单"类选题');
    } else if (shareRate >= 1) {
      strengths.push('转发率优秀，内容具有传播价值');
    }

    // ===== 流量来源分析 =====
    if (traffic === '推荐' && plays < 5000) {
      issues.push('推荐流量不足');
      suggestions.push('标签不精准 — 优化视频标签和描述，使用赛道精准关键词如"出租屋改造""智能家居"');
      suggestions.push('封面点击率低 — 优化封面设计，使用高对比度+大字标题+人物表情，提升推荐流点击率');
    } else if (traffic === '关注' && plays < 1000) {
      issues.push('粉丝活跃度低');
      suggestions.push('粉丝粘性不足 — 增加系列化内容，培养粉丝追更习惯');
    } else if (traffic === '搜索') {
      if (strengths.length === 0 && issues.length === 0) {
        strengths.push('搜索流量稳定，长尾价值好');
      }
    }

    // ===== 综合评分 =====
    let score = 0;
    if (completion >= 45) score += 30;
    else if (completion >= 30) score += 20;
    else if (completion >= 15) score += 10;

    if (likeRate >= 5) score += 25;
    else if (likeRate >= 3) score += 18;
    else if (likeRate >= 1) score += 10;

    if (commentRate >= 1) score += 20;
    else if (commentRate >= 0.5) score += 15;
    else if (commentRate >= 0.1) score += 8;

    if (shareRate >= 1) score += 25;
    else if (shareRate >= 0.5) score += 18;
    else if (shareRate >= 0.1) score += 10;

    score = Math.min(score, 100);

    let level = 'low';
    if (score >= 70) level = 'high';
    else if (score >= 40) level = 'mid';

    return { issues, suggestions, strengths, score, level, rates: { likeRate, commentRate, shareRate } };
  }

  function renderAnalysis(result, data) {
    const el = $('#analysisResult');
    const levelText = result.level === 'high' ? '爆款潜力' : result.level === 'mid' ? '有提升空间' : '需要优化';
    const levelClass = result.level;

    el.style.display = 'block';
    el.innerHTML = `
      <div class="result-header">
        <div class="result-score-wrap">
          <div class="score-circle ${levelClass}">${result.score}</div>
          <div class="result-score-label">综合评分<strong>${levelText}</strong></div>
        </div>
        <div class="result-rates">
          <div class="rate-pill">
            <span class="rate-pill-value">${result.rates.likeRate.toFixed(1)}%</span>
            <span class="rate-pill-label">点赞率</span>
          </div>
          <div class="rate-pill">
            <span class="rate-pill-value">${result.rates.commentRate.toFixed(2)}%</span>
            <span class="rate-pill-label">评论率</span>
          </div>
          <div class="rate-pill">
            <span class="rate-pill-value">${result.rates.shareRate.toFixed(2)}%</span>
            <span class="rate-pill-label">转发率</span>
          </div>
        </div>
      </div>
      ${result.strengths.length > 0 ? `
        <div class="result-section">
          <div class="result-section-title ok">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            做得好的
          </div>
          ${result.strengths.map(s => `<div class="suggestion-item" style="background:var(--success-bg)"><div class="suggestion-num" style="background:var(--success)">&nbsp;</div>${escapeHtml(s)}</div>`).join('')}
        </div>
      ` : ''}
      ${result.issues.length > 0 ? `
        <div class="result-section">
          <div class="result-section-title issue">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            发现的问题
          </div>
          ${result.issues.map(i => `<div class="suggestion-item" style="background:var(--danger-bg)"><div class="suggestion-num" style="background:var(--danger)">!</div>${escapeHtml(i)}</div>`).join('')}
        </div>
      ` : ''}
      ${result.suggestions.length > 0 ? `
        <div class="result-section">
          <div class="result-section-title suggestion">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>
            优化建议
          </div>
          ${result.suggestions.map((s, i) => `<div class="suggestion-item"><div class="suggestion-num">${i + 1}</div>${escapeHtml(s)}</div>`).join('')}
        </div>
      ` : ''}
    `;

    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function saveReview(review) {
    const reviews = loadData(REVIEW_KEY, []);
    reviews.unshift(review);
    if (reviews.length > 50) reviews.length = 50;
    saveData(REVIEW_KEY, reviews);
  }

  function renderHistory() {
    const reviews = loadData(REVIEW_KEY, []);
    const section = $('#historySection');
    const list = $('#historyList');

    if (reviews.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    list.innerHTML = reviews.slice(0, 20).map(r => {
      const d = new Date(r.date);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const levelClass = r.result.level;
      return `
        <div class="history-item">
          <div class="history-item-info">
            <div class="history-item-title">${escapeHtml(r.title)}</div>
            <div class="history-item-meta">${dateStr} · 播放${r.plays} · 完播${r.completion}%</div>
          </div>
          <div class="history-item-score ${levelClass}">${r.result.score}</div>
        </div>
      `;
    }).join('');
  }

  /* ===== HTML 转义 ===== */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  /* ===== 平台映射与链接文案 ===== */
  const PLATFORM_NAME = { douyin: '抖音', bilibili: 'B站', xiaohongshu: '小红书' };

  function getSourceClass(source) {
    if (!source) return 'douyin';
    if (source.indexOf('小红书') !== -1) return 'xiaohongshu';
    if (source.indexOf('B') !== -1 || source.indexOf('b') !== -1) return 'bilibili';
    return 'douyin';
  }

  function getLinkLabel(url) {
    if (!url) return '查看原视频';
    if (url.indexOf('xiaohongshu') !== -1) return '在小红书搜索该笔记';
    if (url.indexOf('bilibili') !== -1) return '在B站搜索该视频';
    if (url.indexOf('douyin') !== -1) return url.indexOf('/search') !== -1 ? '在抖音搜索该视频' : '查看原视频';
    if (url.indexOf('/search') !== -1) return '搜索该内容';
    return '查看原视频';
  }

const EMBEDDED = {
  "douyin": [
    {
      "title": "新房装修预算两万,做一套满配到顶的全屋智能,实际住进去到底有多爽?",
      "author": "张超人全屋智能",
      "plays": "千万级播放",
      "likes": "10万+赞",
      "analysis": "这条视频跑到了千万级播放。核心火因:1.价格锚点——'2万预算满配全屋智能'精准击中想做智能但怕贵的人群;2.真实落地案例——140平三房两厅实拍,不是概念而是住进去的真实体验;3.细节密度极高——从智能灯光色温调节到传感器全屋覆盖,干货让观众觉得'学到了';4.情绪价值——中控大屏带来'家在我掌控中'的掌控感;5.结尾引导'一箭三连'推高互动率。",
      "creationIdeas": "原创方向:做'1万预算版全屋智能'对比测评,用更低预算复刻其核心功能(智能灯+无线开关+存在传感器),切入'普通人也能做的智能家'。标题建议:'张超人2万那套我也做了,只花一半钱效果差在哪?'。差异点:原版偏高端完整方案,二创版聚焦平价平替,贴合大众预算。",
      "url": "https://www.douyin.com/shipin/7619955035937687590"
    },
    {
      "title": "30㎡老破小改奶油系疗愈舱,48小时播放破千万",
      "author": "阿初",
      "plays": "48小时破千万",
      "likes": "弹幕清一色'原来租房也能这样活'",
      "analysis": "核心火因:1.极致反差——老破小vs疗愈舱的视觉冲击;2.情绪价值——'治愈我的不是房,是她'引发年轻人共鸣,房子小但生活要精致;3.低成本可复制——拆吊顶、贴冰箱、铺地毯都是租房党能照做的;4.平台数据印证:小红书'小户型改造'笔记同比暴涨174%,情绪价值成家装新硬装。",
      "creationIdeas": "原创方向:做'智能家居版奶油风改造',在软装改造基础上加入平价智能设备(智能灯带、智能音箱、感应夜灯),让疗愈感+科技感结合。标题:'把老破小改成疗愈舱后,我加了500块智能设备,朋友赖着不走'。差异点:原版偏美学软装,二创版加入'智能疗愈'新角度。",
      "url": "https://www.douyin.com/search/30㎡老破小改奶油系疗愈舱"
    },
    {
      "title": "重庆夫妻65㎡的家火了,光一个客厅就被无数人效仿",
      "author": "真实案例(今日头条热文)",
      "plays": "200万人围观",
      "likes": "评论区清一色'这哪是家,是会变形的乐高'",
      "analysis": "核心火因:1.'去客厅化'反共识观点引发讨论(沙发对面没电视,投影幕布替代);2.可变家具(带轮边几、悬浮床大抽屉)解决小户型痛点,实用性强;3.15万装修清单透明,用户可抄作业;4.智能五金(带USB插座床头)等细节戳中真实痛点。",
      "creationIdeas": "原创方向:做'小户型+智能可变家具'方案,如电动升降桌、智能收纳,把'可变'概念和智能结合。标题:'65㎡住出90㎡,我还加了智能家具让家每天不一样'。差异点:原版偏空间设计,二创版加'智能可变',如语音控制升降桌、感应灯。",
      "url": "https://www.douyin.com/search/重庆夫妻65㎡的家火了光一个客厅就被无数人效仿"
    }
  ],
  "bilibili": [
    {
      "title": "如何只花6000元搞定智能家居(2026年最新)",
      "author": "张超人全屋智能",
      "plays": "12.1万播放",
      "likes": "160赞",
      "analysis": "B站教科书级智能家居UP主。这条23分钟长视频获12.1万播放,核心火因:1.极低预算门槛吸引大量想入门的用户;2.保姆级教程——从设备选型到水电预留一次讲清,信息密度高;3.B站长视频深度内容天然有搜索长尾流量;4.真实落地案例(1.5万杭州案例等)系列化建立信任。",
      "creationIdeas": "原创方向:做'3000元极简智能入门'更低价版本,或'租房党智能改造'不需布线的方案。标题:'跟着张超人学完,我用3000块给出租屋装了智能'。差异点:原版偏硬装全屋,二创版聚焦租房/免布线场景,如无线开关+智能插座+存在传感器。",
      "url": "https://search.bilibili.com/all?keyword=如何只花6000元搞定智能家居"
    },
    {
      "title": "不用丢沙发!传统客厅也能变身大书房",
      "author": "一期爆改",
      "plays": "5772万播放(系列合计)",
      "likes": "系列爆改粉丝房间",
      "analysis": "核心火因:1.'一期爆改'系列化IP,免费爆改粉丝房间的真实感极强;2.传统客厅改书房切中大量小户型家庭痛点;3.改造前后对比+温馨结尾的情绪钩子;4.低成本可复制——不丢原有家具的改造方案,观众能抄作业。该系列已更新100+期,是B站家居改造头部IP。",
      "creationIdeas": "原创方向:做'智能版客厅改造'——在书房化改造基础上加入智能灯光(护眼模式)、智能插座(设备联动)、智能窗帘,打造'智能书房'。标题:'把客厅改成书房后,我加了智能系统,下班只想待在这'。差异点:原版偏空间改造,二创版加智能场景。",
      "url": "https://search.bilibili.com/all?keyword=一期爆改 客厅改书房"
    },
    {
      "title": "租房改造系列:10天不到5000块把土味出租屋改成这样",
      "author": "新房旧做",
      "plays": "系列爆款(多期百万级)",
      "likes": "真实租房改造案例",
      "analysis": "核心火因:1.大量真实租房改造案例(40㎡LOFT、10天5000块出租屋)覆盖不同人群;2.'不砸墙不刷漆用软装改造精装房'等低成本方案实用;3.户型多样(小户型、老破小、出租屋)让观众对号入座;4.B站'我在B站搞装修'IP带动家居内容热潮。",
      "creationIdeas": "原创方向:做'租房智能改造不破坏原装修'系列,用免打孔免布线智能设备(磁吸灯、智能插座、无线开关)。标题:'房东不让改?我用免安装智能设备把出租屋变科技宅'。差异点:原版偏美学改造,二创版聚焦智能+免破坏,精准切租房人群。",
      "url": "https://search.bilibili.com/all?keyword=新房旧做 租房改造"
    }
  ],
  "xiaohongshu": [
    {
      "title": "2026小红书最火'适我主义'装修:不追风格,家越住越舒服",
      "author": "小红书居住趋势 / 李小冷不冷等博主",
      "plays": "话题超20亿浏览·626万讨论",
      "likes": "多篇笔记点赞10万+",
      "analysis": "小红书将'适我主义'选为2026年度居住趋势,相关话题浏览量超20亿、讨论626万次,仅小红书就出现多篇点赞超10万的爆款笔记。火因:1.反共识——跳出奶油风/侘寂风标签绑架,从'我'出发;2.情绪共鸣强——@酱女申儿 把水槽架高5cm、@阿潘的家 洗碗机抬高30cm等'不弯腰设计'精准戳中打工人;3.可复制——'适懒化/适老化/适宠化'人人能对号入座;4.新榜数据印证近三月多篇10万+爆款,趋势红利明确。",
      "creationIdeas": "原创方向:做'适我化智能家居'系列——把'不弯腰/适懒化'和智能结合,如感应夜灯、电动升降、语音控制。标题建议:'小红书爆火的适我主义,加智能设备后爽在哪?'。差异点:原热点偏装修理念,二创版开辟'智能适我'新角度,正好切你的智能家居赛道。",
      "url": "https://www.xiaohongshu.com/search_result?keyword=2026适我主义装修"
    },
    {
      "title": "租房党必看!早上7点的智能联动,从起床到出门只要10分钟",
      "author": "科技贤仔聊家居",
      "plays": "52万+播放·9千赞",
      "likes": "收藏率高达4%",
      "analysis": "小红书科技家居博主(粉丝12.8万)。这条52万播放视频火因:1.场景化沉浸——闹钟→灯亮→咖啡机→窗帘开→出门关灯关空调,完整展示智能生活流;2.痛点精准——'起床困难症''出门忘关'是大众高频痛点;3.数据硬——该账号收藏率4%、转发率15%,实用价值被高度认可;4.评论区变'科技家居交流群',粉丝主导互动模式推高活跃。",
      "creationIdeas": "原创方向:复制其'沉浸式体验'打法,做'晚上的智能联动'或'下班回家场景',附平价设备清单+分步教程。标题建议:'跟着科技贤仔抄作业,800块实现早7点智能联动'。差异点:原版偏展示,二创版给可买清单+手把手教学,降低行动门槛。",
      "url": "https://www.xiaohongshu.com/search_result?keyword=科技贤仔聊家居 早上7点的智能联动"
    },
    {
      "title": "106㎡老破小逆袭成网红屋!15万装出全屋定制智能家居",
      "author": "小红书家居博主(长治土著)",
      "plays": "小红书点赞2W+",
      "likes": "附避坑指南+材料清单",
      "analysis": "真实改造案例,火因:1.极致反差——老破小→通透三房+全屋智能,视觉冲击强;2.预算透明——15万清单+省5万避坑,用户能直接抄作业;3.智能落地——小米生态链(约3000元)做主灯语音+窗帘+门锁,证明智能不贵;4.干货密度高——附避坑指南+材料清单+配色方案,收藏价值极高。",
      "creationIdeas": "原创方向:做'老破小智能改造清单',把案例里的小米方案拆成可买清单逐个讲解。标题建议:'抄作业!老破小装全屋智能我只花3000,清单在这'。差异点:原版偏整体改造,二创版聚焦'智能部分'平价复刻,精准切租房/老房人群。",
      "url": "https://www.xiaohongshu.com/search_result?keyword=老破小逆袭 全屋定制智能家居"
    }
  ],
  "hot": [
    {
      "title": "2026广州建博会:智能家居'空间革命',海尔发布L4级智能体HomeClaw",
      "source": "行业热点",
      "plays": "7月8日建博会近2000家企业参展",
      "trending": "7月8日广州建博会,智能家居馆最热。海尔发布L4级智能体家电Seeker套系+HomeClaw,从'听指令'到'主动服务'——说'我回家了'系统自动联动灯光空调安防。智能家居从单品智能迈向空间认知,话题自带科技前沿热度,适合做'智能家居未来已来'类内容。",
      "recreationPlan": "二创方案:做'2026建博会最值得关注的5个智能黑科技'盘点视频。角度:用通俗易懂的方式解读'主动服务'是什么,对比传统智能音箱。结构:开场抛出'你家智能设备真的智能吗?'→展示建博会黑科技→给出普通人现在能买的平替。标题:'逛完建博会我悟了,这才是真智能家居'。时长:60秒。差异点:原热点偏行业报道,二创版用消费者视角解读,降低理解门槛。",
      "url": "https://www.iimedia.cn/c1104/113052.html"
    },
    {
      "title": "好莱客推'插电即用'全屋智能方案,免布线撬动存量房改造",
      "source": "行业热点",
      "plays": "7月6日证券日报报道",
      "trending": "好莱客子公司推Ho-mesh无线组网技术,全屋智能免开槽免预埋,通电自动组网,适配新房/二手房/租房。精准切中'存量房智能改造'痛点——传统智能依赖前期布线,只适合新房。话题实用性强,适合做'不用重新装修也能装智能'类内容。",
      "recreationPlan": "二创方案:做'不重新装修,出租屋/老房怎么装全屋智能'实操视频。角度:以'插电即用'为钩子,演示免布线智能方案。结构:痛点(租房不能改线)→方案(无线组网设备)→实装演示→成本清单。标题:'房东不让布线?这套插电即用的智能方案绝了'。时长:50秒。差异点:原热点偏企业发布,二创版用个人实操视角,给出可买清单。",
      "url": "https://www.toutiao.com/article/7659269779605193268"
    },
    {
      "title": "《2026大家居创新趋势报告》发布:'AI智能+极致舒适'成消费王道",
      "source": "今日头条",
      "plays": "7月7日发布",
      "trending": "报告明确指出2026家居消费从'颜值即正义'转向'AI智能+极致舒适'。AI智能沙发能感知疲劳自动调节腰托。话题切中年轻人'舒适优先'消费观,适合做趋势解读类内容,且'舒适+智能'是家居赛道长期红利方向。",
      "recreationPlan": "二创方案:做'2026家居5大趋势,第3个和智能有关'盘点。角度:用报告数据+个人观点,解读智能舒适趋势。结构:列趋势→重点展开智能家居(智能沙发/灯光/安防)→给观众选购建议。标题:'2026装修别只看颜值了,这5个趋势才是王道'。时长:55秒。差异点:原热点偏报告解读,二创版用'避坑+趋势'实用化,引导观众现在就能行动。",
      "url": "https://www.toutiao.com/article/7660012411478442547/"
    },
    {
      "title": "小户型改造vlog爆火:30㎡奶油系疗愈舱48小时破千万",
      "source": "抖音",
      "plays": "48小时破千万",
      "trending": "情绪价值成家装新硬装。近30天小红书'小户型改造'笔记同比暴涨174%,'奶油风''轻法式'互动量高出大盘3.8倍,25-34岁女性为主力。适合做'情绪价值改造'类内容,且可自然嫁接智能疗愈设备(智能灯光、香薰、感应夜灯)。",
      "recreationPlan": "二创方案:做'给小家加点智能疗愈感'视频。角度:在奶油风软装基础上,加入智能灯光(暖光模式)、智能香薰、感应夜灯,打造'疗愈智能家'。结构:展示改造→加入智能设备→展示夜间/回家场景。标题:'奶油风改造后,加了智能设备治愈感翻倍'。时长:45秒。差异点:原热点偏美学,二创版加'智能疗愈',开辟差异化切入点。",
      "url": "https://www.douyin.com/search/30㎡奶油系疗愈舱48小时破千万"
    },
    {
      "title": "小红书'适我主义'成2026年度居住趋势,相关话题超20亿浏览",
      "source": "小红书",
      "plays": "超20亿浏览·626万讨论",
      "trending": "小红书官方将'适我主义'选为2026年度居住趋势,相关话题浏览量超20亿、讨论626万次。核心:家不再被风格标签绑架,从'我'的需求出发——'适懒化'(不弯腰设计)、'适老化'、'适宠化'。智能家居天然契合'适我'逻辑(语音控制、感应联动减少动手),是家居赛道当下最大流量红利之一。",
      "recreationPlan": "二创方案:做'适我主义+智能家居'主题视频。角度:用'不弯腰的智能家'切入,展示感应夜灯、电动升降、语音控制如何落地'适懒化'。结构:抛出'你家真的适合你吗?'→拆解适我三大维度→每个维度配一个智能方案→给出预算。标题:'小红书爆火的适我主义,加智能设备后简直开挂'。时长:55秒。差异点:原热点偏装修理念,二创版用'智能适我'新角度,完美切你的赛道。",
      "url": "https://www.xiaohongshu.com/search_result?keyword=2026适我主义装修"
    },
    {
      "title": "科技贤仔聊家居《租房党500元改造智能小窝》:点赞1.2万·收藏5.8万",
      "source": "小红书",
      "plays": "点赞1.2万·收藏5.8万",
      "trending": "小红书科技家居博主'科技贤仔聊家居'(粉丝12.8万)的爆款笔记。火因:1.痛点精准——租房预算有限+起床难;2.产品平价——推荐百元内智能灯泡、震动闹钟、睡眠监测仪;3.场景真实——展示完整租房改造过程;4.收藏率极高(5.8万收藏)说明'能抄作业'的干货最易被收藏转发,极适合二次改编成视频。",
      "recreationPlan": "二创方案:做'租房智能改造不破坏原装修'视频,把笔记里的平价清单拍成实装演示。角度:免打孔免布线智能设备(磁吸灯、智能插座、无线开关)。结构:痛点(房东不让改)→清单(500元3件套)→实装演示→夜间场景。标题:'房东不让改?500块免安装智能设备把出租屋变科技宅'。时长:50秒。差异点:原笔记偏图文清单,二创版用视频实景演示,信息更直观、更易模仿。",
      "url": "https://www.xiaohongshu.com/search_result?keyword=科技贤仔聊家居 租房党500元改造智能小窝"
    }
  ]
};

  /* ===== 初始化 ===== */
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initClock();
    initDailyPlan();
    initTopicInspiration();
    initHotVideos();
    initContentReview();
    initInstallButton();
  });

  // PWA 安装引导：常驻入口 + 原生安装优先 + 不支持时给出菜单指引
  function initInstallButton() {
    const sidebarBtn = $('#installBtn');
    const banner = $('#installBanner');
    const bannerBtn = $('#installBannerBtn');
    const bannerClose = $('#installBannerClose');
    const modal = $('#installModal');
    const modalClose = $('#installModalClose');

    // 已安装（独立模式）或曾关闭引导 → 不显示横幅
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || navigator.standalone === true;
    const dismissed = localStorage.getItem('installBannerDismissed') === '1';
    if (isStandalone || dismissed) {
      if (banner) banner.style.display = 'none';
    }

    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });

    function triggerInstall() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.catch(() => {});
        deferredPrompt = null;
        if (banner) banner.style.display = 'none';
      } else {
        // 浏览器不支持直接弹窗（多为微信/系统浏览器，或已划掉安装提示）
        if (modal) modal.classList.add('show');
      }
    }

    if (sidebarBtn) sidebarBtn.addEventListener('click', triggerInstall);
    if (bannerBtn) bannerBtn.addEventListener('click', triggerInstall);
    if (bannerClose) bannerClose.addEventListener('click', () => {
      if (banner) banner.style.display = 'none';
      localStorage.setItem('installBannerDismissed', '1');
    });
    if (modalClose) modalClose.addEventListener('click', () => {
      if (modal) modal.classList.remove('show');
    });
    if (modal) modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('show');
    });

    window.addEventListener('appinstalled', () => {
      if (banner) banner.style.display = 'none';
      if (modal) modal.classList.remove('show');
    });
  }

})();
