(function () {
  'use strict';

  const IMG_W = 1672, IMG_H = 941, RATIO = IMG_W / IMG_H;
  const KEY = 'bepque.v1', COIN = 10;
  const ROOM_RATIO = 0.75, ROOM_BONUS = 50;   // cần học đúng 75% đồ vật để qua phòng, thưởng 50 xu
  const ZOOMS = [1, 1.6, 2.4];
  const ZOOM_LABELS = ['Phóng to', 'Phóng to hơn', 'Thu nhỏ'];
  const QUESTS = [
    { id: 'explore', label: 'Khám phá 5 đồ vật', goal: 5, reward: 20 },
    { id: 'learn', label: 'Trả lời đúng 3 từ', goal: 3, reward: 20 }
  ];

  const $ = (s) => document.querySelector(s);
  const viewport = $('#viewport'), stage = $('#stage'), spots = $('#spots');
  const sheet = $('#sheet'), form = $('#answer-form'), input = $('#answer'), feedback = $('#feedback');
  const questSheet = $('#quests'), notebook = $('#notebook');

  /* ---------- Lưu trữ ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  function today() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function defaults() { return { coins: 0, lang: 'en', items: {}, done: {}, daily: { date: today(), explored: [], correct: [], claimed: {} } }; }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const s = JSON.parse(raw); return Object.assign(defaults(), s); }
    } catch (e) { /* chế độ riêng tư hoặc dữ liệu hỏng: dùng mặc định */ }
    return defaults();
  }
  const state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* bỏ qua */ } }
  function rollDaily() { if (!state.daily || state.daily.date !== today()) state.daily = defaults().daily; }
  function itemState(id) { return state.items[id] || (state.items[id] = {}); }
  function syncVocab() {
    VOCAB.forEach((it) => { const s = state.items[it.id] || {}; it.discovered = !!s.discovered; it.learned = !!(s.en || s.ja); });
  }
  rollDaily(); syncVocab();

  /* ---------- Phòng ---------- */
  const ROOM = {}; ROOMS.forEach((r) => { ROOM[r.id] = r; });
  const itemsOf = (id) => VOCAB.filter((i) => i.room === id);
  const learnedIn = (id) => itemsOf(id).filter((i) => i.learned).length;
  const needOf = (id) => Math.ceil(itemsOf(id).length * ROOM_RATIO);
  const roomIndex = (id) => ROOMS.findIndex((r) => r.id === id);
  const nextRoom = (id) => ROOMS[roomIndex(id) + 1] || null;
  function isUnlocked(id) { const i = roomIndex(id); return i <= 0 || !!state.done[ROOMS[i - 1].id]; }
  const openItems = () => VOCAB.filter((i) => isUnlocked(i.room));
  ROOMS.forEach((r) => { if (isUnlocked(r.id) && learnedIn(r.id) >= needOf(r.id)) state.done[r.id] = true; });
  let roomId = ROOMS[0].id;

  /* ---------- Kiểm tra đáp án ---------- */
  function norm(s, lang) {
    let t = String(s).normalize('NFKC').trim();
    if (lang === 'en') {
      t = t.toLowerCase().replace(/[.!?,]+$/g, '').replace(/\s+/g, ' ').trim().replace(/^(a|an|the)\s+/, '');
    } else {
      t = t.replace(/\s+/g, '').replace(/[。.!！]+$/g, '');
    }
    return t;
  }
  const hasCJK = (t) => /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/.test(t);
  function check(item, lang, text) {
    const n = norm(text, lang);
    if (!n) return { status: 'empty' };
    if (lang === 'ja' && !hasCJK(n)) return { status: 'script' };
    if (lang === 'en' && hasCJK(n)) return { status: 'script' };
    const hit = item[lang].find((a) => norm(a, lang) === n);
    return hit ? { status: 'ok', answer: hit } : { status: 'wrong' };
  }
  function readingOf(item, ans) { return item.alt[ans] || [item.reading, item.romaji]; }

  /* ---------- Phát âm ---------- */
  const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  function speak(text, lang) {
    if (!canSpeak) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === 'ja' ? 'ja-JP' : 'en-US'; u.rate = 0.85;
      window.speechSynthesis.speak(u);
    } catch (e) { /* bỏ qua */ }
  }

  /* ---------- Thông báo ---------- */
  const toastEl = $('#toast'); const queue = []; let toastBusy = false;
  function toast(msg) { queue.push(msg); if (!toastBusy) nextToast(); }
  function nextToast() {
    const m = queue.shift();
    if (!m) { toastBusy = false; toastEl.hidden = true; return; }
    toastBusy = true; toastEl.hidden = false; toastEl.textContent = m;
    toastEl.style.animation = 'none'; void toastEl.offsetWidth; toastEl.style.animation = '';
    setTimeout(nextToast, 2300);
  }

  /* ---------- HUD, nhiệm vụ ---------- */
  function questProgress(q) { return q.id === 'explore' ? state.daily.explored.length : state.daily.correct.length; }
  function updateHud(bump) {
    $('#coins').textContent = state.coins;
    $('#room-learned').textContent = learnedIn(roomId);
    $('#room-need').textContent = needOf(roomId);
    $('#quest-mini').textContent = QUESTS.filter((q) => questProgress(q) >= q.goal).length + '/' + QUESTS.length;
    if (bump) { const p = $('#coins').parentNode; p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
    $('#nb-mini').textContent = openItems().filter((i) => i.learned).length + '/' + openItems().length;
    if (!questSheet.hidden) renderQuests();
    if (!notebook.hidden) renderNotebook();
  }
  function checkQuests() {
    rollDaily();
    let gained = false;
    QUESTS.forEach((q) => {
      if (questProgress(q) >= q.goal && !state.daily.claimed[q.id]) {
        state.daily.claimed[q.id] = true; state.coins += q.reward; gained = true;
        toast('Hoàn thành nhiệm vụ “' + q.label + '”: +' + q.reward + ' xu');
      }
    });
    save(); updateHud(gained);
  }
  function renderQuests() {
    const list = $('#quest-list'); list.textContent = '';
    QUESTS.forEach((q) => {
      const n = Math.min(questProgress(q), q.goal);
      const box = document.createElement('div'); box.className = 'quest';
      const p = document.createElement('p');
      const a = document.createElement('span'); a.textContent = q.label;
      const b = document.createElement('b'); b.textContent = state.daily.claimed[q.id] ? 'Xong · +' + q.reward + ' xu' : n + '/' + q.goal;
      p.append(a, b);
      const bar = document.createElement('div'); bar.className = 'bar';
      const fill = document.createElement('i'); fill.style.width = (n / q.goal * 100) + '%';
      bar.append(fill); box.append(p, bar); list.append(box);
    });
    const op = openItems();
    $('#stats').textContent = 'Đã khám phá ' + op.filter((i) => i.discovered).length + '/' + op.length +
      ' đồ vật. Đã học ' + op.filter((i) => i.learned).length + ' từ. Nhiệm vụ làm mới mỗi ngày.';
  }

  /* ---------- Vùng chạm ---------- */
  function buildSpots(id) {
    spots.textContent = '';
    itemsOf(id).forEach((item) => {
      item.rects.forEach((r) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'hotspot' + (item.discovered ? ' seen' : '');
        b.dataset.id = item.id; b.setAttribute('aria-label', item.vi);
        b.style.left = ((r[0] + r[2] / 2) / IMG_W * 100) + '%';
        b.style.top = ((r[1] + r[3] / 2) / IMG_H * 100) + '%';
        b.style.width = (r[2] / IMG_W * 100) + '%';
        b.style.height = (r[3] / IMG_H * 100) + '%';
        b.addEventListener('click', () => {
          b.classList.remove('tap'); void b.offsetWidth; b.classList.add('tap');
          setTimeout(() => openItem(item), 150);
        });
        spots.append(b);
      });
    });
  }
  if (/[?&]debug/.test(location.search)) stage.classList.add('debug');

  function markDiscovered(item) {
    const s = itemState(item.id);
    if (!s.discovered) {
      s.discovered = true; item.discovered = true;
      document.querySelectorAll('.hotspot[data-id="' + item.id + '"]').forEach((el) => el.classList.add('seen'));
    }
    rollDaily();
    if (state.daily.explored.indexOf(item.id) < 0) state.daily.explored.push(item.id);
    save(); checkQuests();
  }

  /* ---------- Cửa sổ học từ ---------- */
  let current = null, lang = 'en', wrong = 0, pendingDone = null;
  function openItem(item) {
    current = item; wrong = 0; markDiscovered(item);
    $('#sheet-title').textContent = item.vi;
    setLang(state.lang === 'ja' ? 'ja' : 'en');
    sheet.hidden = false;
  }
  function closeSheet() { sheet.hidden = true; current = null; if (canSpeak) { try { speechSynthesis.cancel(); } catch (e) {} } if (pendingDone) showDone(); }
  function setLang(l) {
    lang = l; state.lang = l; save();
    ['en', 'ja'].forEach((k) => {
      const t = $('#tab-' + k);
      t.setAttribute('aria-selected', String(k === l));
      t.classList.toggle('done', !!(current && itemState(current.id)[k]));
    });
    const p = $('#prompt'); p.textContent = '';
    p.append('Trong tiếng ' + (l === 'en' ? 'Anh' : 'Nhật') + ', “' + current.vi + '” là gì?');
    if (l === 'ja') {
      const s = document.createElement('small');
      s.textContent = 'Cần bật bàn phím tiếng Nhật (Cài đặt › Cài đặt chung › Bàn phím). Nhập bằng hiragana, katakana hoặc kanji.';
      p.append(s);
    }
    input.value = ''; input.lang = l === 'ja' ? 'ja' : 'en';
    input.placeholder = l === 'ja' ? 'Nhập từ tiếng Nhật…' : 'Nhập từ tiếng Anh…';
    feedback.textContent = ''; feedback.className = ''; wrong = 0;
  }
  document.querySelectorAll('.tabs button').forEach((t) => t.addEventListener('click', () => setLang(t.dataset.lang)));
  $('#sheet-close').addEventListener('click', closeSheet);
  $('#later').addEventListener('click', closeSheet);
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });

  function showWrong(msg, hint) {
    feedback.className = 'no'; feedback.textContent = '';
    const a = document.createElement('p'); a.textContent = msg; feedback.append(a);
    if (hint) { const b = document.createElement('p'); b.textContent = hint; feedback.append(b); }
    if (hint && current) {   // câu trả lời sai: có nút mở sổ tay đúng mục của đồ vật này
      const nb = document.createElement('button'); nb.type = 'button'; nb.className = 'speak nb-btn'; const ic = document.createElement('img'); ic.className = 'nb-ico'; ic.src = 'assets/notebook.png'; ic.alt = ''; nb.append(ic, 'Mở sổ tay');
      const item = current; nb.addEventListener('click', () => openNotebookFor(item)); feedback.append(nb);
    }
  }
  function hintText() {
    let h;
    if (lang === 'en') h = 'Gợi ý: từ có ' + current.en[0].length + ' chữ cái, bắt đầu bằng “' + current.en[0][0] + '”.';
    else h = 'Gợi ý: cách đọc bắt đầu bằng “' + current.reading[0] + '”.';
    if (wrong >= 2) h += ' ' + current.note;
    return h;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!current) return;
    const r = check(current, lang, input.value);
    if (r.status === 'empty') return showWrong('Hãy nhập một từ trước khi kiểm tra nhé.');
    if (r.status === 'script') {
      return showWrong(lang === 'ja' ? 'Bạn đang ở tab 日本語. Hãy nhập bằng chữ Nhật.' : 'Bạn đang ở tab English. Hãy nhập bằng chữ Latin.');
    }
    if (r.status === 'wrong') { wrong++; return showWrong('Chưa đúng, thử lại nhé. Bạn không bị trừ xu.', hintText()); }

    const st = itemState(current.id), first = !st.rewarded;
    st[lang] = true; current.learned = true;
    if (first) { st.rewarded = true; state.coins += COIN; }
    rollDaily();
    if (state.daily.correct.indexOf(current.id) < 0) state.daily.correct.push(current.id);
    save(); showCorrect(r.answer, first); setLang_tabMarks(); checkQuests(); updateHud(first); checkRoomDone();
    if (st.en && st.ja) {   // đã nhập đúng cả tiếng Anh lẫn tiếng Nhật: tự đóng cửa sổ
      const finished = current;
      const note = document.createElement('p'); note.textContent = 'Bạn đã học đủ cả tiếng Anh và tiếng Nhật. Cửa sổ sẽ tự đóng.';
      feedback.append(note);
      setTimeout(() => { if (current === finished && !sheet.hidden) closeSheet(); }, 2200);
    }
  });
  function checkRoomDone() {
    const id = current ? current.room : roomId;
    if (state.done[id] || learnedIn(id) < needOf(id)) return;
    state.done[id] = true; state.coins += ROOM_BONUS; pendingDone = id; save();
    const nx = nextRoom(id);
    const msg = 'Hoàn thành ' + ROOM[id].name + '! +' + ROOM_BONUS + ' xu' + (nx ? '. Đã mở khóa ' + nx.name + '.' : '.');
    const p = document.createElement('p'); p.className = 'gain'; p.textContent = msg; feedback.append(p);
    toast(msg); updateHud(true);
  }
  function setLang_tabMarks() { ['en', 'ja'].forEach((k) => $('#tab-' + k).classList.toggle('done', !!itemState(current.id)[k])); }

  function showCorrect(ans, first) {
    feedback.className = 'ok'; feedback.textContent = '';
    const add = (cls, txt) => { const p = document.createElement('p'); if (cls) p.className = cls; p.textContent = txt; feedback.append(p); return p; };
    add('', first ? 'Chính xác! Giỏi lắm.' : 'Chính xác!');
    add('big', ans);
    let say = ans;
    if (lang === 'ja') { const rd = readingOf(current, ans); add('', 'Cách đọc: ' + rd[0] + ' (' + rd[1] + ')'); say = rd[0]; }
    const others = current[lang].filter((a) => a !== ans);
    if (others.length) add('', 'Cũng được chấp nhận: ' + others.join(', '));
    add('', current.note);
    add(first ? 'gain' : '', first ? '+' + COIN + ' xu' : 'Bạn đã nhận xu cho đồ vật này rồi.');
    if (canSpeak) {
      const s = document.createElement('button'); s.type = 'button'; s.className = 'speak'; s.textContent = 'Nghe phát âm';
      s.addEventListener('click', () => speak(say, lang)); feedback.append(s);
      speak(say, lang);
    }
  }


  /* ---------- Sổ tay từ vựng ---------- */
  let nbCat = 'all';
  const byId = {}; VOCAB.forEach((i) => { byId[i.id] = i; });
  function nbGroups() {
    const groups = CATEGORIES.filter((c) => isUnlocked(c.room || ROOMS[0].id))
      .map((c) => ({ id: c.id, name: c.name, items: c.ids.map((id) => byId[id]).filter(Boolean) }))
      .filter((g) => g.items.length);
    const used = {}; groups.forEach((g) => g.items.forEach((i) => { used[i.id] = 1; }));
    const rest = openItems().filter((i) => !used[i.id]);   // đồ vật chưa xếp nhóm
    if (rest.length) groups.push({ id: 'khac', name: 'Khác', items: rest });
    return groups;
  }
  function renderNotebook() {
    const groups = nbGroups();
    if (nbCat !== 'all' && !groups.some((g) => g.id === nbCat)) nbCat = 'all';
    const chips = $('#nb-chips'); chips.textContent = '';
    [{ id: 'all', name: 'Tất cả' }].concat(groups).forEach((g) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = g.name;
      b.setAttribute('aria-selected', String(g.id === nbCat));
      b.addEventListener('click', () => { nbCat = g.id; renderNotebook(); });
      chips.append(b);
    });
    const shown = groups.filter((g) => nbCat === 'all' || g.id === nbCat);
    const items = [].concat.apply([], shown.map((g) => g.items));
    $('#nb-stats').textContent = 'Đã học ' + items.filter((i) => i.learned).length + '/' + items.length + ' từ · Đã khám phá ' +
      items.filter((i) => i.discovered).length + '/' + items.length + ' đồ vật';
    const list = $('#nb-list'); list.textContent = '';
    const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
    const sayBtn = (text, k) => {
      if (!canSpeak) return null;
      const s = mk('button', 'say', 'Nghe'); s.type = 'button';
      s.addEventListener('click', (ev) => { ev.preventDefault(); speak(text, k); });
      return s;
    };
    items.forEach((it) => {
      const st = state.items[it.id] || {};
      const box = mk('details', 'entry'); box.dataset.id = it.id;
      const sum = mk('summary', '');
      sum.append(mk('span', 'vi', it.vi), mk('span', 'badge' + (it.learned ? ' ok' : ''), it.learned ? 'Đã học' : 'Chưa học'));
      box.append(sum);

      const en = mk('div', 'block');
      en.append(mk('span', 'lang', 'English' + (st.en ? ' ✓' : '')));
      const enLine = mk('div', 'line');
      enLine.append(mk('span', 'word', it.en.join(', ')));
      const b1 = sayBtn(it.en[0], 'en'); if (b1) enLine.append(b1);
      en.append(enLine); box.append(en);

      const ja = mk('div', 'block');
      ja.append(mk('span', 'lang', '日本語' + (st.ja ? ' ✓' : '')));
      it.ja.forEach((w) => {
        const rd = readingOf(it, w);
        const line = mk('div', 'line');
        const left = mk('span', '');
        left.append(mk('span', 'word', w), mk('span', 'rd', rd[0] === w ? ' (' + rd[1] + ')' : ' (' + rd[0] + ', ' + rd[1] + ')'));
        line.append(left);
        const b = sayBtn(rd[0], 'ja'); if (b) line.append(b);
        ja.append(line);
      });
      box.append(ja);
      box.append(mk('p', 'note', it.note));
      list.append(box);
    });
  }
  function openNotebookFor(item) {
    const g = nbGroups().find((x) => x.items.indexOf(item) >= 0);
    nbCat = g ? g.id : 'all';
    renderNotebook(); notebook.hidden = false;
    const box = document.querySelector('#nb-list details[data-id="' + item.id + '"]');
    if (box) { box.open = true; box.scrollIntoView({ block: 'center' }); }
  }
  $('#btn-notebook').addEventListener('click', () => { renderNotebook(); notebook.hidden = false; $('#nb-list').scrollTop = 0; });
  $('#nb-close').addEventListener('click', () => { notebook.hidden = true; });
  notebook.addEventListener('click', (e) => { if (e.target === notebook) notebook.hidden = true; });

  /* ---------- Nút điều khiển ---------- */
  let revealTimer = null;
  $('#btn-find').addEventListener('click', () => {
    stage.classList.add('reveal'); clearTimeout(revealTimer);
    revealTimer = setTimeout(() => stage.classList.remove('reveal'), 3800);
    const left = itemsOf(roomId).filter((i) => !i.discovered).length;
    toast(left ? 'Chấm vàng là đồ vật chưa khám phá. Còn ' + left + ' đồ vật.' : 'Bạn đã khám phá hết mọi đồ vật!');
  });
  $('#btn-quests').addEventListener('click', () => { rollDaily(); renderQuests(); questSheet.hidden = false; });
  $('#quests-close').addEventListener('click', () => { questSheet.hidden = true; });
  questSheet.addEventListener('click', (e) => { if (e.target === questSheet) questSheet.hidden = true; });
  $('#btn-reset').addEventListener('click', () => {
    if (!window.confirm('Xóa toàn bộ xu và tiến trình học?')) return;
    try { localStorage.removeItem(KEY); } catch (e) { /* bỏ qua */ }
    Object.assign(state, defaults()); syncVocab();
    document.querySelectorAll('.hotspot.seen').forEach((el) => el.classList.remove('seen'));
    questSheet.hidden = true; roomId = ROOMS[0].id; goRooms(); updateHud(); toast('Đã xóa tiến trình.');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!sheet.hidden) closeSheet(); if (!questSheet.hidden) questSheet.hidden = true; if (!notebook.hidden) notebook.hidden = true; if (!rules.hidden) rules.hidden = true; if (!doneSheet.hidden) doneSheet.hidden = true; }
  });

  /* ---------- Bố cục và phóng to ---------- */
  let zoomIdx = 0;
  function layout() {
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const base = vw >= vh ? vw : vh * RATIO;   // dọc: cao vừa màn hình, vuốt ngang; ngang: rộng vừa màn hình
    const w = base * ZOOMS[zoomIdx];
    stage.style.width = w + 'px'; stage.style.height = (w / RATIO) + 'px';
  }
  function relayout(center) {
    const sw = stage.offsetWidth || 1, sh = stage.offsetHeight || 1;
    const cx = center ? center[0] : (viewport.scrollLeft + viewport.clientWidth / 2) / sw;
    const cy = center ? center[1] : (viewport.scrollTop + viewport.clientHeight / 2) / sh;
    layout();
    viewport.scrollLeft = cx * stage.offsetWidth - viewport.clientWidth / 2;
    viewport.scrollTop = cy * stage.offsetHeight - viewport.clientHeight / 2;
  }
  $('#btn-zoom').addEventListener('click', () => {
    zoomIdx = (zoomIdx + 1) % ZOOMS.length;
    $('#btn-zoom').textContent = ZOOM_LABELS[zoomIdx];
    relayout();
  });
  window.addEventListener('resize', () => { if (!screens.game.hidden) relayout(); });
  window.addEventListener('orientationchange', () => { setTimeout(() => { if (!screens.game.hidden) relayout(); }, 200); });

  /* ---------- Màn hình: bắt đầu, chọn phòng, chơi ---------- */
  const screens = { start: $('#start'), rooms: $('#rooms'), game: $('#game') };
  const rules = $('#rules'), doneSheet = $('#done'), bg = $('#bg');
  function show(name) { Object.keys(screens).forEach((k) => { screens[k].hidden = k !== name; }); }

  function renderRooms() {
    const list = $('#room-list'); list.textContent = '';
    const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
    ROOMS.forEach((r, i) => {
      const open = isUnlocked(r.id), done = !!state.done[r.id];
      const n = Math.min(learnedIn(r.id), needOf(r.id)), need = needOf(r.id);
      const b = mk('button', 'room' + (open ? '' : ' locked') + (done ? ' done' : '')); b.type = 'button';
      if (!open) b.setAttribute('aria-disabled', 'true');
      const thumb = mk('div', 'thumb');
      const img = mk('img'); img.src = r.img; img.alt = ''; img.loading = 'lazy'; img.draggable = false;
      thumb.append(img);
      if (done) thumb.append(mk('span', 'tag', 'Hoàn thành'));
      else if (!open) thumb.append(mk('span', 'tag', 'Khóa'));
      const info = mk('div', 'info');
      info.append(mk('h3', '', r.name));
      if (open) {
        info.append(mk('p', 'desc', r.desc));
        const meta = mk('p', 'meta'); meta.append(mk('span', '', 'Đã học ' + n + '/' + need + ' từ'), mk('span', '', done ? 'Xong' : 'Cần ' + need));
        const bar = mk('div', 'bar'), fill = mk('i'); fill.style.width = (need ? n / need * 100 : 0) + '%'; bar.append(fill);
        info.append(meta, bar);
      } else {
        info.append(mk('p', 'desc', 'Hoàn thành “' + ROOMS[i - 1].name + '” để mở khóa phòng này.'));
      }
      b.append(thumb, info);
      b.addEventListener('click', () => enterRoom(r.id));
      list.append(b);
    });
  }

  let hintShown = false;
  function enterRoom(id) {
    if (!isUnlocked(id)) { toast('Hãy hoàn thành “' + ROOMS[roomIndex(id) - 1].name + '” trước nhé.'); return; }
    roomId = id; stage.classList.remove('reveal');
    $('#bg-error').hidden = true;
    bg.alt = ROOM[id].alt; bg.src = ROOM[id].img;
    buildSpots(id);
    zoomIdx = 0; $('#btn-zoom').textContent = ZOOM_LABELS[0];
    show('game'); layout(); relayout([0.48, 0.5]); updateHud();
    if (!hintShown && viewport.clientHeight > viewport.clientWidth) {
      hintShown = true;
      const h = $('#hint'); h.hidden = false;
      const hide = () => { h.hidden = true; };
      setTimeout(hide, 7000); viewport.addEventListener('touchstart', hide, { once: true });
    }
  }
  function goRooms() {
    if (!sheet.hidden) { sheet.hidden = true; current = null; }
    questSheet.hidden = true; notebook.hidden = true; doneSheet.hidden = true; $('#hint').hidden = true;
    renderRooms(); show('rooms');
  }
  function showDone() {
    const id = pendingDone; pendingDone = null; if (!id) return;
    const nx = nextRoom(id);
    $('#done-title').textContent = 'Hoàn thành ' + ROOM[id].name + '!';
    $('#done-text').textContent = 'Bạn đã học ' + learnedIn(id) + '/' + itemsOf(id).length + ' từ và nhận thêm ' + ROOM_BONUS + ' xu. ' +
      (nx ? 'Phòng “' + nx.name + '” đã được mở khóa.' : 'Bạn đã hoàn thành tất cả các phòng hiện có!');
    $('#done-next').textContent = nx ? 'Sang ' + nx.name : 'Về danh sách phòng';
    $('#done-next').onclick = () => { doneSheet.hidden = true; if (nx) enterRoom(nx.id); else goRooms(); };
    doneSheet.hidden = false;
  }
  $('#done-stay').addEventListener('click', () => { doneSheet.hidden = true; });
  $('#btn-start').addEventListener('click', () => { renderRooms(); show('rooms'); });
  $('#btn-rules').addEventListener('click', () => { rules.hidden = false; });
  $('#rules-close').addEventListener('click', () => { rules.hidden = true; });
  $('#rules-ok').addEventListener('click', () => { rules.hidden = true; });
  rules.addEventListener('click', (e) => { if (e.target === rules) rules.hidden = true; });
  $('#rooms-back').addEventListener('click', () => show('start'));
  $('#btn-rooms').addEventListener('click', goRooms);

  /* ---------- Khởi động ---------- */
  bg.addEventListener('error', () => { $('#bg-error').hidden = false; });
  updateHud(); checkQuests(); show('start');
})();