(function () {
  "use strict";
  const D = window.N1_DATA;
  if (!D) return;

  const KEY = "bepque.n1.v1";
  const SIZE = { vocab: 10, grammar: 5 };

  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  const pad = (n) => String(n).padStart(2, "0");
  const dateKey = (d) =>
    d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const dayNum = () =>
    Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);

  /* ---------- Lưu trữ (có try/catch vì trình duyệt có thể chặn) ---------- */
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      return s && typeof s === "object" ? s : {};
    } catch (e) {
      return {};
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch (e) {
      /* bỏ qua */
    }
  }
  const st = load();
  st.custom = Array.isArray(st.custom) ? st.custom : [];
  st.learned = st.learned || {};
  st.days = st.days || {};
  st.hist = st.hist || {}; // ngày -> các từ đã được chọn học trong ngày đó
  st.tests = Array.isArray(st.tests) ? st.tests : []; // lịch sử bài test nhỏ
  st.testBlock = st.testBlock || 0; // đã làm test cho bao nhiêu đợt 7 ngày
  st.starred = st.starred && typeof st.starred === "object" ? st.starred : {}; // từ đánh dấu ★ (chưa nhớ)

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pick = (list, count, offset) => {
    const out = [];
    for (let i = 0; i < Math.min(count, list.length); i++) {
      out.push(list[(offset + i) % list.length]);
    }
    return out;
  };

  /* ---------- Danh sách từ: sách (nếu có) + từ có sẵn + từ tự thêm ---------- */
  function allVocab() {
    const book = Array.isArray(window.N1_VOCAB_BOOK) ? window.N1_VOCAB_BOOK : [];
    const seen = new Set();
    return (D.vocab || [])
      .concat(book, st.custom)
      .filter((v) => {
        if (!v || !v.w || seen.has(v.w)) return false;
        seen.add(v.w);
        return true;
      });
  }

  /* ---------- Ngữ pháp: ưu tiên bộ câu từ tài liệu (grammar-data.js), không có thì dùng bộ cũ ---------- */
  let grammarCache = null;
  function allGrammar() {
    const book = Array.isArray(window.N1_GRAMMAR_BOOK) ? window.N1_GRAMMAR_BOOK : [];
    const src = book.length ? book : D.grammar || [];
    if (!grammarCache || grammarCache.src !== src) {
      // Xáo trộn cố định để các câu cùng một mẫu không dồn vào cùng một ngày
      const order = src.map((_, i) => i);
      let seed = 20261026;
      for (let i = order.length - 1; i > 0; i--) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const j = seed % (i + 1);
        [order[i], order[j]] = [order[j], order[i]];
      }
      grammarCache = { src, list: order.map((i) => src[i]) };
    }
    return grammarCache.list;
  }

  /* ---------- Phiếu bé ngoan: mỗi ngày học xong là một dấu ✓ ---------- */
  const CHART = {
    w: 1536,
    h: 1024,
    cols: [220, 445, 665, 882, 1100, 1320],
    rows: [362, 503, 640, 780, 922],
  };
  function stickerChart() {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const wrap = el("div", "study-chart");
    const img = el("img", "study-chart-img");
    img.src = "assets/study/phieu-be-ngoan.jpg";
    img.alt = "Phiếu bé ngoan";
    img.draggable = false;
    wrap.append(img);
    for (let n = 1; n <= 30; n++) {
      const i = n - 1;
      const done = !!st.days[dateKey(new Date(y, m, n))];
      const stamp = el("span", "study-stamp" + (done ? " on" : ""));
      if (done) {
        const rot = ((n * 37) % 17) - 8; // mỗi dấu nghiêng một chút cho tự nhiên
        stamp.title = "Ngày " + n + ": bé ngoan";
        stamp.style.setProperty("--rot", rot + "deg");
        // Tự vẽ dấu bằng style trực tiếp để không phụ thuộc CSS bên ngoài
        const st0 = stamp.style;
        st0.position = "absolute";
        st0.display = "block";
        st0.width = "8%";
        st0.aspectRatio = "1 / 1";
        st0.transform = "translate(-50%, -50%) rotate(" + rot + "deg)";
        st0.opacity = "1";
        st0.visibility = "visible";
        st0.zIndex = "2";
        st0.pointerEvents = "none";
        st0.background = "none";
        const si = el("img");
        si.src = "assets/study/stamp-be-ngoan.png";
        si.alt = "✓";
        si.draggable = false;
        si.style.cssText = "width:100%;height:100%;object-fit:contain;display:block";
        si.addEventListener("error", () => {
          si.remove();
          stamp.textContent = "✓";
          st0.color = "#d6336c";
          st0.fontWeight = "800";
          st0.fontSize = "clamp(14px, 3.4vw, 28px)";
          st0.textAlign = "center";
          st0.lineHeight = "1";
        });
        stamp.append(si);
      }
      stamp.style.left = (CHART.cols[i % 6] / CHART.w) * 100 + "%";
      stamp.style.top = (CHART.rows[Math.floor(i / 6)] / CHART.h) * 100 + "%";
      wrap.append(stamp);
    }
    return wrap;
  }

  /* ---------- Từ vựng: mỗi ngày cố định 20 từ phải học ---------- */
  function ensureToday() {
    const k = dateKey(new Date());
    if (st.today && st.today.date === k && st.today.fixed && st.today.words.length === SIZE.vocab) return;
    const all = allVocab();
    const fresh = shuffle(all.filter((v) => !st.learned[v.w]));
    const rest = shuffle(all.filter((v) => st.learned[v.w]));
    const picked = fresh.concat(rest).slice(0, SIZE.vocab); // thiếu từ mới thì lấy thêm từ đã thuộc cho đủ 20
    st.today = { date: k, fixed: true, words: picked.map((v) => v.w) };
    st.hist[k] = Array.from(new Set((st.hist[k] || []).concat(st.today.words)));
    save();
  }

  /* 20 từ của hôm nay (giữ nguyên cả ngày, mở lại vẫn là các từ đó) */
  function todayVocab() {
    ensureToday();
    const byWord = new Map(allVocab().map((v) => [v.w, v]));
    return st.today.words.map((w) => byWord.get(w)).filter(Boolean);
  }

  /* ---------- Phát âm tiếng Nhật (giọng đọc của trình duyệt) ---------- */
  function speak(text) {
    try {
      if (!("speechSynthesis" in window) || !text) return;
      if (st.settings && st.settings.sound === false) return; // đã tắt phát âm trong Cài đặt
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = 0.9;
      const voice = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang && v.lang.toLowerCase().startsWith("ja"));
      if (voice) u.voice = voice;
      window.speechSynthesis.speak(u);
    } catch (e) {
      /* bỏ qua nếu trình duyệt không hỗ trợ */
    }
  }

  function startVocab() {
    return todayVocab();
  }

  /* ---------- Bài học hôm nay theo từng mục ---------- */
  /* ---------- Ngữ pháp: 3 dạng bài ----------
   * fill    : điền chỗ trống (có sẵn)
   * meaning : cho mẫu (vd ～あっての) -> chọn nghĩa tiếng Việt
   * pattern : cho nghĩa tiếng Việt -> chọn mẫu đúng
   */
  const GRAM_KINDS = ["fill", "meaning", "pattern"];
  const splitNote = (note) => {
    const i = (note || "").indexOf("：");
    if (i < 0) return null;
    return { pat: note.slice(0, i).trim(), mean: note.slice(i + 1).trim() };
  };
  const hasPattern = (q) => !!splitNote(q.note);
  let patternCache = null;
  function grammarPatterns() {
    if (patternCache && patternCache.src === allGrammar()) return patternCache.list;
    const seen = new Map();
    allGrammar().forEach((q) => {
      const p = splitNote(q.note);
      if (p && p.pat && !seen.has(p.pat)) seen.set(p.pat, p);
    });
    patternCache = { src: allGrammar(), list: Array.from(seen.values()) };
    return patternCache.list;
  }

  function planFor(section) {
    const d = dayNum();
    if (section === "vocab") return startVocab();
    if (section === "grammar") {
      const g = allGrammar();
      const picked = pick(g, SIZE.grammar, (d * SIZE.grammar) % Math.max(1, g.length));
      const pool = grammarPatterns();
      return picked.map((q, i) => {
        // luân phiên 3 dạng; câu không có mẫu/nghĩa thì giữ dạng điền chỗ trống
        const kinds = pool.length >= 4 && hasPattern(q) ? GRAM_KINDS : ["fill"];
        return Object.assign({}, q, { kind: kinds[(i + d) % kinds.length] });
      });
    }
    const rb = Array.isArray(window.N1_READING_BOOK) && window.N1_READING_BOOK.length ? window.N1_READING_BOOK : D.reading;
    return rb.length ? [rb[d % rb.length]] : [];
  }

  function streak() {
    let n = 0;
    const d = new Date();
    while (st.days[dateKey(d)]) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  /* ---------- Bài test nhỏ: cứ học đủ 7 ngày là có một bài ---------- */
  const TEST = { days: 7, vocab: 8, grammar: 2 };
  const lab = (v) => v.w + (v.r ? "（" + v.r + "）" : "");
  const studyDays = () => Object.keys(st.days).filter((d) => st.days[d]).sort();
  const testReady = () => Math.floor(studyDays().length / TEST.days) > st.testBlock;

  function buildTest() {
    const all = allVocab();
    const byWord = new Map(all.map((v) => [v.w, v]));
    const words = [];
    studyDays()
      .slice(-TEST.days)
      .forEach((d) =>
        (st.hist[d] || []).forEach((w) => {
          if (st.learned[w] && !words.includes(w)) words.push(w);
        })
      );
    let pool = words.map((w) => byWord.get(w)).filter(Boolean);
    if (pool.length < 4) pool = all.filter((v) => st.learned[v.w]);
    if (pool.length < 4) pool = all;

    const qs = shuffle(pool)
      .slice(0, TEST.vocab)
      .map((item) => {
        const wrong = shuffle(all.filter((v) => v.w !== item.w)).slice(0, 3);
        return {
          type: "vocab",
          q: item.m,
          opts: shuffle([item].concat(wrong).map(lab)),
          a: lab(item),
          item,
        };
      });
    shuffle(allGrammar())
      .slice(0, TEST.grammar)
      .forEach((g) =>
        qs.push({ type: "grammar", q: g.s, opts: shuffle(g.opts), a: g.opts[g.a], note: g.note })
      );
    return qs;
  }

  /* ---------- Khung màn hình ---------- */
  const screen = $("#study");
  const body = $("#study-body");
  const todayBtn = $("#study-today"); // nút "Từ vựng hôm nay"
  /* Icon nét dùng chung cho thanh tab và nút cài đặt */
  const ICONS = {
    book:
      '<path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    map: '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>',
    gear:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  };
  const icon = (name) => {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = ICONS[name];
    return s;
  };
  todayBtn.type = "button";
  todayBtn.replaceChildren(icon("book"));
  const chartBtn = todayBtn.cloneNode(false); // nút "Phiếu bé ngoan" nằm cạnh nút trên
  chartBtn.id = "study-chart-btn";
  chartBtn.type = "button";
  chartBtn.replaceChildren(icon("star"));
  chartBtn.setAttribute("aria-label", "Phiếu bé ngoan");
  chartBtn.title = "Phiếu bé ngoan";
  todayBtn.after(chartBtn);
  const mapBtn = $("#study-map-btn"); // nút "Bản đồ" trên thanh tab dưới
  mapBtn.replaceChildren(icon("map"));
  const settingsBtn = $("#study-settings-btn"); // nút cài đặt ở đầu màn
  settingsBtn.replaceChildren(icon("gear"));
  const todayPanel = $("#study-today-panel");
  let view = "home"; // home | vocab | grammar | reading | done | map
  let addOpen = false;
  let todayOpen = false;
  let flash = "";
  let sess = null;

  /* ---------- Nhạc nền của Luyện N1 (dùng chung thẻ #bgm có sẵn) ---------- */
  let studyMusicOn = false; // N1 là bên đang phát nhạc
  function playStudyMusic() {
    const bgm = $("#bgm");
    if (!bgm || (st.settings && st.settings.music === false)) return;
    bgm.volume = 0.35;
    const p = bgm.play();
    if (p && p.catch) p.catch(() => {}); // trình duyệt chặn thì bỏ qua
    studyMusicOn = true;
  }
  function stopStudyMusic() {
    const bgm = $("#bgm");
    if (bgm && studyMusicOn) bgm.pause();
    studyMusicOn = false;
  }

  function showStudy(on) {
    if (!on) {
      stopAuto();
      welcome.hidden = true;
      stopStudyMusic();
    }
    screen.hidden = !on;
    $("#start").hidden = on;
  }

  function render() {
    body.textContent = "";
    const views = {
      home: renderHome,
      vocab: renderVocab,
      grammar: renderGrammar,
      reading: renderReading,
      done: renderDone,
      test: renderTest,
      testdone: renderTestDone,
      map: renderMap,
      settings: renderSettings,
    };
    views[view]();
    screen.classList.toggle("chalk", view === "vocab" && sess.phase === "type"); // bảng đen chỉ cho phần gõ từ vựng
    mapBtn.classList.toggle("open", view === "map");
    settingsBtn.classList.toggle("open", view === "settings");
    screen.classList.toggle("map-view", view === "map"); // bản đồ toàn màn hình, nền là đường
    renderTodayPanel();
  }

  /* ---------- Danh sách từ đã học hôm nay ---------- */
  let todayTab = "chart"; // chart | words
  let wordsMode = "today"; // today | saved (danh sách từ đã đánh dấu ★)

  function toggleStar(w) {
    if (st.starred[w]) delete st.starred[w];
    else st.starred[w] = true;
    save();
  }
  function paintStar(btn, on, w) {
    btn.textContent = on ? "★" : "☆";
    btn.title = on ? "Bỏ đánh dấu" : "Đánh dấu từ chưa nhớ";
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", (on ? "Bỏ lưu " : "Lưu ") + w);
    btn.style.color = on ? "#f5b301" : "#a89868";
  }
  function renderTodayPanel() {
    todayPanel.hidden = !todayOpen;
    body.hidden = todayOpen;
    const onWords = todayOpen && todayTab === "words";
    const onChart = todayOpen && todayTab === "chart";
    todayBtn.classList.toggle("open", onWords);
    todayBtn.setAttribute("aria-expanded", String(onWords));
    chartBtn.classList.toggle("open", onChart);
    chartBtn.setAttribute("aria-expanded", String(onChart));
    if (!todayOpen) return;
    todayPanel.textContent = "";

    if (todayTab === "chart") {
      todayPanel.append(stickerChart());
      return;
    }

    const savedWords = () => allVocab().filter((x) => st.starred[x.w]);
    const saved = wordsMode === "saved";
    const words = saved ? savedWords() : todayVocab();
    const doneCount = words.filter((x) => st.learned[x.w]).length;

    const switchBtn = el("button", "study-star-switch");
    switchBtn.type = "button";
    const paintSwitch = () => {
      switchBtn.textContent = saved ? "← Từ vựng hôm nay" : "★ Từ đã lưu (" + savedWords().length + ")";
    };
    paintSwitch();
    const sw = switchBtn.style;
    sw.cssText =
      "display:block;margin:0 0 10px auto;padding:6px 14px;border-radius:999px;cursor:pointer;" +
      "font:inherit;font-size:14px;color:inherit;background:transparent;border:1.5px dashed currentColor";
    switchBtn.addEventListener("click", () => {
      wordsMode = saved ? "today" : "saved";
      renderTodayPanel();
    });
    todayPanel.append(switchBtn);

    todayPanel.append(
      el(
        "h3",
        "study-h",
        saved
          ? "Từ đã lưu ★ (" + words.length + ")"
          : "Từ vựng hôm nay (thuộc " + doneCount + "/" + words.length + ")"
      )
    );
    if (!words.length)
      todayPanel.append(
        el(
          "p",
          "study-sub",
          saved ? "Chưa lưu từ nào. Bấm ☆ cạnh từ chưa nhớ để lưu lại." : "Chưa có từ vựng nào trong kho."
        )
      );
    words.forEach((x) => {
      const done = !!st.learned[x.w];
      const row = el("div", "study-today-row " + (done ? "ok" : ""));
      const text = el("div", "study-today-text");
      text.append(
        el("b", null, x.w + (x.r ? "（" + x.r + "）" : "")),
        el("span", null, x.m)
      );
      const side = el("div", "study-today-side");

      const starBtn = el("button", "study-star-mini");
      starBtn.type = "button";
      starBtn.style.cssText =
        "background:none;border:0;cursor:pointer;font-size:24px;line-height:1;padding:4px 6px;";
      paintStar(starBtn, !!st.starred[x.w], x.w);
      starBtn.addEventListener("click", () => {
        toggleStar(x.w);
        const on = !!st.starred[x.w];
        if (saved && !on) {
          renderTodayPanel(); // bỏ lưu trong danh sách đã lưu thì dòng biến mất
          return;
        }
        paintStar(starBtn, on, x.w);
        paintSwitch();
      });

      const speakBtn = el("button", "study-speak-mini", "🔊");
      speakBtn.type = "button";
      speakBtn.setAttribute("aria-label", "Nghe " + x.w);
      speakBtn.addEventListener("click", () => speak(x.r || x.w));
      side.append(starBtn, speakBtn, el("i", null, done ? "✓" : ""));
      row.append(text, side);
      todayPanel.append(row);
    });

    if (saved) return; // danh sách đã lưu không kèm phần ngữ pháp

    const grammar = planFor("grammar");
    todayPanel.append(el("h3", "study-h", "Ngữ pháp (" + grammar.length + ")"));
    grammar.forEach((q) => {
      const row = el("div", "study-today-row");
      row.append(el("b", null, q.s.replace("＿＿＿", q.opts[q.a])), el("span", null, q.note));
      todayPanel.append(row);
    });
  }

  function progressBar(cur, total) {
    const wrap = el("div", "study-bar");
    const fill = el("span");
    fill.style.width = (total ? (cur / total) * 100 : 0) + "%";
    wrap.append(fill);
    return wrap;
  }

  /* ---------- Màn hình chọn mục ---------- */
  function renderHome() {
    const total = allVocab().length;
    const learned = Object.keys(st.learned).length;
    const doneToday = !!st.days[dateKey(new Date())];
    const pct = total ? Math.round((learned / total) * 100) : 0;

    const hero = el("section", "study-hero");
    const chips = el("div", "study-chips");
    chips.append(
      el("span", "study-chip", "Chuỗi " + streak() + " ngày"),
      el("span", "study-chip " + (doneToday ? "done" : "soft"), doneToday ? "Đã học hôm nay" : "Chưa học hôm nay")
    );
    hero.append(
      chips,
      el("p", "study-hero-title", "Đã thuộc " + learned + " / " + total + " từ"),
      progressBar(learned, total),
      el("p", "study-sub", pct + "% kho từ vựng")
    );
    body.append(hero);
    body.append(testCard());

    body.append(el("h3", "study-h", "Chọn phần để luyện"));
    const list = el("div", "study-choices");
    [
      ["vocab", "Từ vựng", SIZE.vocab + " từ, gõ từ tiếng Nhật theo nghĩa"],
      ["grammar", "Ngữ pháp", SIZE.grammar + " câu điền chỗ trống"],
      ["reading", "Bài đọc", "1 bài kèm câu hỏi"],
    ].forEach(([key, title, desc]) => {
      const b = el("button", "study-choice");
      b.type = "button";
      b.append(el("b", null, title), el("small", null, desc));
      b.addEventListener("click", () => start(key));
      list.append(b);
    });
    body.append(list);

    const toggle = el("button", "study-add-toggle", addOpen ? "Đóng form thêm từ" : "+ Thêm từ mới");
    toggle.type = "button";
    toggle.addEventListener("click", () => {
      addOpen = !addOpen;
      render();
    });
    body.append(toggle);
    if (addOpen) body.append(addForm());
  }

  function testCard() {
    const box = el("section", "study-test" + (testReady() ? " ready" : ""));
    const ready = testReady();
    const filled = ready ? TEST.days : Math.min(TEST.days, studyDays().length - st.testBlock * TEST.days);
    box.append(
      el("h3", "study-h", ready ? "Bài test nhỏ đã sẵn sàng!" : "Bài test nhỏ sau 7 ngày học")
    );
    const dots = el("div", "study-dots");
    for (let n = 0; n < TEST.days; n++) dots.append(el("span", "study-dot" + (n < filled ? " on" : "")));
    box.append(dots);
    if (ready) {
      box.append(el("p", "study-sub", "Bạn đã học đủ 7 ngày. Làm thử " + (TEST.vocab + TEST.grammar) + " câu để xem mình nhớ được bao nhiêu nhé."));
      const b = el("button", "primary full", "Làm bài test");
      b.type = "button";
      b.addEventListener("click", startTest);
      box.append(b);
    } else {
      box.append(el("p", "study-sub", "Đã học " + filled + "/" + TEST.days + " ngày. Còn " + (TEST.days - filled) + " ngày nữa là có bài test."));
    }
    return box;
  }

  function addForm() {
    const form = el("form", "study-form");
    const fields = [
      ["w", "Từ tiếng Nhật (kanji hoặc kana)"],
      ["r", "Cách đọc (kana, không bắt buộc)"],
      ["m", "Nghĩa tiếng Việt"],
    ].map(([key, label]) => {
      const wrap = el("label", "study-field");
      wrap.append(el("span", null, label));
      const input = el("input");
      input.type = "text";
      input.name = key;
      input.autocomplete = "off";
      wrap.append(input);
      form.append(wrap);
      return [key, input];
    });
    const msg = el("p", "study-sub", flash);
    flash = "";
    const submit = el("button", "secondary", "Thêm vào danh sách");
    submit.type = "submit";
    form.append(submit, msg);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = Object.fromEntries(fields.map(([k, i]) => [k, i.value.trim()]));
      if (!v.w || !v.m) {
        msg.textContent = "Cần nhập ít nhất từ và nghĩa.";
        return;
      }
      st.custom.push(v);
      save();
      flash = "Đã thêm. Từ này sẽ xuất hiện trong bài học sắp tới.";
      render();
    });
    return form;
  }

  function start(section) {
    // Từ vựng: bước 1 chọn nghĩa (trắc nghiệm), bước 2 mới tới gõ từ
    sess = {
      section,
      items: planFor(section),
      i: 0,
      score: 0,
      total: 0,
      phase: section === "vocab" ? "pick" : undefined,
    };
    view = section;
    render();
  }

  function startTest() {
    todayOpen = false;
    sess = { section: "test", items: buildTest(), i: 0, score: 0, total: 0, wrong: [] };
    view = "test";
    render();
  }

  /* ---------- Từ vựng: gõ từ tiếng Nhật theo nghĩa ---------- */
  const AUTO_NEXT_MS = 1000; // đúng rồi thì sau 1 giây tự sang từ tiếp theo
  let autoTimer = null;
  function stopAuto() {
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
  }

  /* Bước 1 của từ vựng: nhìn từ tiếng Nhật, chọn nghĩa đúng (trắc nghiệm) */
  function renderVocabPick() {
    const list = sess.items;
    const item = list[sess.i];
    body.append(
      el("p", "study-sub", "Chọn nghĩa " + (sess.i + 1) + "/" + list.length),
      progressBar(sess.i, list.length),
      el("div", "study-card study-q", item.w + (item.r ? "（" + item.r + "）" : ""))
    );

    const wrong = shuffle(allVocab().filter((v) => v.w !== item.w && v.m !== item.m))
      .slice(0, 3)
      .map((v) => v.m);
    const opts = shuffle([item.m].concat(wrong));
    const box = el("div", "study-opts");
    const note = el("p", "study-note");
    note.hidden = true;
    const nextBtn = el("button", "primary full", sess.i + 1 < list.length ? "Từ tiếp" : "Sang phần gõ từ");
    nextBtn.type = "button";
    nextBtn.hidden = true;

    opts.forEach((o) => {
      const b = el("button", "study-opt", o);
      b.type = "button";
      b.addEventListener("click", () => {
        const ok = o === item.m;
        box.querySelectorAll("button").forEach((x) => (x.disabled = true));
        b.classList.add(ok ? "ok" : "bad");
        if (!ok) {
          [...box.querySelectorAll("button")]
            .find((x) => x.textContent === item.m)
            ?.classList.add("ok");
        }
        speak(item.r || item.w);
        note.textContent = (ok ? "Đúng! " : "Chưa đúng. ") + item.w + (item.r ? "（" + item.r + "）" : "") + " = " + item.m;
        note.hidden = false;
        nextBtn.hidden = false;
      });
      box.append(b);
    });
    body.append(box, note, nextBtn);
    nextBtn.addEventListener("click", () => next());
  }

  function renderVocab() {
    if (sess.phase === "pick") {
      renderVocabPick();
      return;
    }
    const items = sess.items;
    const item = items[sess.i];
    let attempts = 0;
    body.append(
      el("p", "study-sub", "Từ vựng " + (sess.i + 1) + "/" + items.length),
      progressBar(sess.i, items.length)
    );
    const card = el("div", "study-card");
    const hintTxt = el("div", "study-hint-txt");
    card.append(el("div", "study-mean", item.m), el("div", "study-hint", "Gõ từ tiếng Nhật"), hintTxt);
    body.append(card);

    const form = el("form", "study-typing");
    const input = el("input", "study-input");
    input.type = "text";
    input.lang = "ja";
    input.autocomplete = "off";
    input.autocapitalize = "off";
    input.setAttribute("aria-label", "Từ tiếng Nhật");
    const hint = el("button", "secondary", "Gợi ý");
    hint.type = "button";
    const chars = Array.from(item.w);
    hint.addEventListener("click", () => {
      hintTxt.textContent =
        "Gợi ý: bắt đầu bằng「" + chars[0] + "」, gồm " + chars.length + " ký tự";
    });
    const check = el("button", "primary", "Kiểm tra");
    check.type = "submit";
    form.append(input, hint, check);
    body.append(form);

    const result = el("p", "study-note");
    result.hidden = true;
    body.append(result);
    const nextBtn = el("button", "primary full", "Tiếp");
    nextBtn.type = "button";
    nextBtn.hidden = true;
    body.append(nextBtn);

    const goNext = () => {
      stopAuto();
      next();
    };
    nextBtn.addEventListener("click", goNext);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      attempts++;
      const ok = val === item.w || (!!item.r && val === item.r);
      const ans = item.w + (item.r ? "（" + item.r + "）" : "");
      if (!ok) {
        // Sai: hiện đáp án đúng, người học phải nhập lại
        if (attempts === 1) sess.total++;
        speak(item.r || item.w);
        result.textContent = "Chưa đúng. Đáp án: " + ans + ". Hãy nhập lại từ đúng.";
        result.classList.remove("ok");
        result.classList.add("bad");
        result.hidden = false;
        input.value = "";
        input.focus();
        return;
      }
      // Đúng: ghi nhận lần đầu, rồi tự chuyển sau 1 giây
      if (attempts === 1) {
        sess.total++;
        sess.score++;
        st.learned[item.w] = true;
        save();
      }
      speak(item.r || item.w);
      result.textContent = "Đúng! " + ans;
      result.classList.remove("bad");
      result.classList.add("ok");
      result.hidden = false;
      input.disabled = true;
      check.hidden = true;
      hint.hidden = true;
      nextBtn.hidden = false;
      stopAuto();
      autoTimer = setTimeout(goNext, AUTO_NEXT_MS);
    });

    setTimeout(() => input.focus(), 0);
  }

  /* ---------- Ngữ pháp ---------- */
  function renderGrammar() {
    const list = sess.items;
    const q = list[sess.i];
    const kind = q.kind || "fill";
    const sp = splitNote(q.note);
    let prompt, correct, options, label;

    if (kind === "meaning" && sp) {
      // Cho mẫu -> chọn nghĩa đúng
      label = "Chọn nghĩa của mẫu";
      prompt = sp.pat;
      correct = sp.mean;
      const others = grammarPatterns().filter((p) => p.pat !== sp.pat).map((p) => p.mean);
      options = shuffle([correct].concat(shuffle(others).filter((m) => m !== correct).slice(0, 3)));
    } else if (kind === "pattern" && sp) {
      // Cho nghĩa -> chọn mẫu đúng
      label = "Chọn mẫu ngữ pháp đúng với nghĩa";
      prompt = sp.mean;
      correct = sp.pat;
      const others = grammarPatterns().filter((p) => p.pat !== sp.pat).map((p) => p.pat);
      options = shuffle([correct].concat(shuffle(others).slice(0, 3)));
    } else {
      label = null;
      prompt = q.s;
      correct = q.opts[q.a];
      options = shuffle(q.opts);
    }

    body.append(
      el("p", "study-sub", "Ngữ pháp " + (sess.i + 1) + "/" + list.length + (label ? " · " + label : "")),
      progressBar(sess.i, list.length),
      el("div", "study-card study-q", prompt)
    );
    const box = el("div", "study-opts");
    const note = el("p", "study-note");
    note.hidden = true;
    const nextBtn = el("button", "primary full", sess.i + 1 < list.length ? "Câu tiếp" : "Xong");
    nextBtn.type = "button";
    nextBtn.hidden = true;

    options.forEach((o) => {
      const b = el("button", "study-opt", o);
      b.type = "button";
      b.addEventListener("click", () => {
        const ok = o === correct;
        sess.total++;
        if (ok) sess.score++;
        box.querySelectorAll("button").forEach((x) => (x.disabled = true));
        b.classList.add(ok ? "ok" : "bad");
        if (!ok) {
          [...box.querySelectorAll("button")]
            .find((x) => x.textContent === correct)
            ?.classList.add("ok");
        }
        note.textContent = (ok ? "Đúng. " : "Chưa đúng, đáp án là " + correct + ". ") + (q.note || "");
        note.hidden = false;
        nextBtn.hidden = false;
      });
      box.append(b);
    });
    body.append(box, note, nextBtn);
    nextBtn.addEventListener("click", () => next());
  }

  /* ---------- Bài đọc ---------- */
  function renderReading() {
    const rd = sess.items[0];
    body.append(el("p", "study-sub", "Bài đọc"), el("h3", "study-h", rd.title));
    body.append(el("div", "study-card study-text", rd.text));

    let answered = 0;
    const finishBtn = el("button", "primary full", "Xong");
    finishBtn.type = "button";
    finishBtn.hidden = true;

    rd.qs.forEach((q) => {
      const correct = q.opts[q.a];
      body.append(el("p", "study-q-text", q.q));
      const box = el("div", "study-opts");
      const why = el("div", "study-note");
      why.hidden = true;
      body.append(why); // giải thích + từ vựng hiện sau khi chọn
      shuffle(q.opts).forEach((o) => {
        const b = el("button", "study-opt", o);
        b.type = "button";
        b.addEventListener("click", () => {
          if (box.dataset.done) return;
          if (q.reason || q.vocab) {
            why.textContent = "";
            if (q.reason) why.append(el("p", null, "Giải thích: " + q.reason));
            (q.vocab || []).forEach((v) =>
              why.append(el("p", null, "・" + v.w + "（" + v.r + "）: " + v.m))
            );
            why.hidden = false;
          }
          box.dataset.done = "1";
          answered++;
          sess.total++;
          if (o === correct) sess.score++;
          box.querySelectorAll("button").forEach((x) => (x.disabled = true));
          b.classList.add(o === correct ? "ok" : "bad");
          [...box.querySelectorAll("button")]
            .find((x) => x.textContent === correct)
            ?.classList.add("ok");
          if (answered === rd.qs.length) finishBtn.hidden = false;
        });
        box.append(b);
      });
      body.append(box);
    });
    body.append(finishBtn);
    finishBtn.addEventListener("click", () => next());
  }

  /* ---------- Chuyển bước và kết thúc ---------- */
  function next() {
    stopAuto();
    sess.i++;
    if (sess.i >= sess.items.length && sess.phase === "pick") {
      // Hết 20 từ trắc nghiệm thì sang phần gõ từ, bắt đầu lại từ đầu
      sess.phase = "type";
      sess.i = 0;
    }
    if (sess.i >= sess.items.length) {
      st.days[dateKey(new Date())] = true;
      save();
      view = "done";
    }
    render();
  }

  /* Con dấu bé ngoan đóng xuống thẻ kết quả */
  function bigStamp() {
    const img = el("img", "study-big-stamp");
    img.src = "assets/study/stamp-be-ngoan.png";
    img.alt = "Con dấu bé ngoan";
    img.draggable = false;
    return img;
  }

  function renderDone() {
    const pct = sess.total ? Math.round((sess.score / sess.total) * 100) : 0;
    const card = el("div", "study-done");
    card.append(
      bigStamp(),
      el("h3", "study-h", "Xong rồi!"),
      el("div", "study-score", sess.score + "/" + sess.total),
      el("p", "study-sub", "câu đúng · " + pct + "%"),
      el("p", "study-stat", "Chuỗi học hiện tại: " + streak() + " ngày")
    );
    body.append(card);
    const back = el("button", "primary full", "Về trang luyện N1");
    back.type = "button";
    back.addEventListener("click", () => {
      view = "home";
      render();
    });
    body.append(back);
  }

  /* ---------- Bài test nhỏ: màn hình câu hỏi và kết quả ---------- */
  function renderTest() {
    const list = sess.items;
    const q = list[sess.i];
    body.append(
      el("p", "study-sub", "Bài test nhỏ " + (sess.i + 1) + "/" + list.length),
      progressBar(sess.i, list.length)
    );
    if (q.type === "vocab") {
      const card = el("div", "study-card");
      card.append(el("div", "study-mean", q.q), el("div", "study-hint", "Chọn từ tiếng Nhật đúng"));
      body.append(card);
    } else {
      body.append(el("div", "study-card study-q", q.q));
    }
    const box = el("div", "study-opts");
    const note = el("p", "study-note");
    note.hidden = true;
    const last = sess.i + 1 >= list.length;
    const nextBtn = el("button", "primary full", last ? "Xem kết quả" : "Câu tiếp");
    nextBtn.type = "button";
    nextBtn.hidden = true;

    q.opts.forEach((o) => {
      const b = el("button", "study-opt", o);
      b.type = "button";
      b.addEventListener("click", () => {
        const ok = o === q.a;
        sess.total++;
        if (ok) sess.score++;
        else sess.wrong.push(q);
        box.querySelectorAll("button").forEach((x) => (x.disabled = true));
        b.classList.add(ok ? "ok" : "bad");
        if (!ok) {
          [...box.querySelectorAll("button")].find((x) => x.textContent === q.a)?.classList.add("ok");
        }
        note.textContent = (ok ? "Đúng! " : "Chưa đúng, đáp án là " + q.a + ". ") + (q.note || "");
        note.classList.toggle("ok", ok);
        note.classList.toggle("bad", !ok);
        note.hidden = false;
        nextBtn.hidden = false;
      });
      box.append(b);
    });
    body.append(box, note, nextBtn);
    nextBtn.addEventListener("click", () => {
      sess.i++;
      if (sess.i >= list.length) {
        st.testBlock = Math.floor(studyDays().length / TEST.days);
        st.tests.push({ date: dateKey(new Date()), score: sess.score, total: sess.total });
        save();
        view = "testdone";
      }
      render();
    });
  }

  function renderTestDone() {
    const pct = sess.total ? Math.round((sess.score / sess.total) * 100) : 0;
    const msg =
      pct >= 80
        ? "Tuyệt vời! Bạn nhớ bài rất tốt."
        : pct >= 50
        ? "Khá lắm! Ôn lại vài từ nữa là vững."
        : "Đừng nản nhé, tuần sau mình cùng cố gắng tiếp!";
    const card = el("div", "study-done");
    if (pct >= 80) card.append(bigStamp()); // đạt từ 80% thì được đóng dấu bé ngoan
    card.append(
      el("h3", "study-h", "Kết quả bài test nhỏ"),
      el("div", "study-score", sess.score + "/" + sess.total),
      el("p", "study-sub", "câu đúng · " + pct + "%"),
      el("p", "study-stat", msg)
    );
    if (sess.wrong.length) {
      card.append(el("p", "study-stat", "Cần ôn lại:"));
      sess.wrong.forEach((q) => {
        const row = el("div", "study-wrong-row");
        if (q.type === "vocab") row.append(el("b", null, lab(q.item)), el("span", null, q.item.m));
        else row.append(el("b", null, q.q.replace("＿＿＿", q.a)), el("span", null, q.note));
        card.append(row);
      });
    }
    body.append(card);
    const back = el("button", "primary full", "Về trang luyện N1");
    back.type = "button";
    back.addEventListener("click", () => {
      view = "home";
      render();
    });
    body.append(back);
  }

  /* ---------- Bản đồ chuỗi ngày ----------
   * Mỗi buổi học là một điểm trên đường zích zắc, đi từ dưới lên.
   * Cứ 7 buổi là một điểm bài test. Bấm điểm đã học để xem lại từ vựng của buổi đó.
   */
  const MAP_GAP = 92; // khoảng cách dọc giữa hai điểm (px)
  const MAP_X = [50, 80, 50, 20]; // vị trí ngang (%) lặp lại theo đường zích zắc
  const MAP_PAD = 48; // chừa chỗ trên/dưới cho đường đi
  let mapPick = null; // chỉ số buổi đang xem từ vựng
  let mapMsg = ""; // thông báo khi bấm điểm chưa mở

  function renderMap() {
    const days = studyDays();
    const studied = days.length;
    const doneToday = !!st.days[dateKey(new Date())];
    const total = Math.max(TEST.days, Math.ceil((studied + 1) / TEST.days) * TEST.days);
    const isTest = (n) => n % TEST.days === 0;

    // trạng thái của điểm thứ n (tính từ 1)
    const statusOf = (n) => {
      if (n <= studied) {
        if (!isTest(n)) return "done";
        return st.testBlock >= n / TEST.days ? "done" : "ready"; // bài test đã làm hay đang chờ
      }
      if (n === studied + 1 && !doneToday) return "current";
      return "locked";
    };

    const H = MAP_PAD * 2 + (total - 1) * MAP_GAP;
    const yOf = (n) => H - MAP_PAD - (n - 1) * MAP_GAP; // điểm 1 ở dưới cùng
    const xOf = (n) => MAP_X[(n - 1) % MAP_X.length];

    const box = el("section", "study-map-wrap");
    const remain = TEST.days - (studied % TEST.days);
    const sub =
      studied % TEST.days === 0 && studied > 0 && testReady()
        ? "Bài test đang chờ bạn!"
        : "Đã học " + studied + " buổi · còn " + remain + " buổi nữa là có bài test";
    box.append(el("h3", "study-h", "Bản đồ chuỗi ngày"), el("p", "study-sub", sub));

    const map = el("div", "study-map");
    map.style.height = H + "px";

    // đường đi nối các điểm
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "study-map-path");
    svg.setAttribute("viewBox", "0 0 100 " + H);
    svg.setAttribute("preserveAspectRatio", "none");
    const path = document.createElementNS(NS, "path");
    let d = "";
    for (let n = 1; n <= total; n++) {
      const x = xOf(n);
      const y = yOf(n);
      if (n === 1) d += "M " + x + " " + y;
      else {
        const ym = (yOf(n - 1) + y) / 2;
        d += " C " + xOf(n - 1) + " " + ym + " " + x + " " + ym + " " + x + " " + y;
      }
    }
    path.setAttribute("d", d);
    path.setAttribute("vector-effect", "non-scaling-stroke");
    svg.append(path);
    map.append(svg);

    // các điểm
    let curNode = null;
    for (let n = 1; n <= total; n++) {
      const status = statusOf(n);
      const test = isTest(n);
      const b = el("button", "map-node " + status + (test ? " test" : ""), test ? "★" : String(n));
      b.type = "button";
      b.style.left = xOf(n) + "%";
      b.style.top = yOf(n) + "px";
      b.setAttribute(
        "aria-label",
        (test ? "Bài test sau buổi " + (n - 1) : "Buổi " + n) +
          (status === "done" ? ", đã học" : status === "locked" ? ", chưa mở" : "")
      );
      b.addEventListener("click", () => onMapNode(n, status, test));
      if (status === "current") curNode = b;
      map.append(b);
    }
    box.append(map);

    if (mapMsg) box.append(el("p", "study-sub study-map-msg", mapMsg));

    // từ vựng của buổi đã chọn
    if (mapPick !== null && days[mapPick]) {
      const date = days[mapPick];
      const byWord = new Map(allVocab().map((v) => [v.w, v]));
      const words = (st.hist[date] || []).map((w) => byWord.get(w)).filter(Boolean);
      const [y, m, dd] = date.split("-");
      const panel = el("div", "study-today study-map-detail");
      panel.append(
        el("h3", "study-h", "Buổi " + (mapPick + 1) + " · " + dd + "/" + m + "/" + y + " (" + words.length + " từ)")
      );
      if (!words.length) panel.append(el("p", "study-sub", "Không có dữ liệu từ vựng của buổi này."));
      words.forEach((x) => {
        const row = el("div", "study-today-row" + (st.learned[x.w] ? " ok" : ""));
        const text = el("div", "study-today-text");
        text.append(el("b", null, x.w + (x.r ? "（" + x.r + "）" : "")), el("span", null, x.m));
        const side = el("div", "study-today-side");
        const speakBtn = el("button", "study-speak-mini", "🔊");
        speakBtn.type = "button";
        speakBtn.setAttribute("aria-label", "Nghe " + x.w);
        speakBtn.addEventListener("click", () => speak(x.r || x.w));
        side.append(speakBtn, el("i", null, st.learned[x.w] ? "✓" : ""));
        row.append(text, side);
        panel.append(row);
      });
      box.append(panel);
    }

    body.append(box);
    if (curNode) setTimeout(() => curNode.scrollIntoView({ block: "center", behavior: "smooth" }), 0);
  }

  function onMapNode(n, status, test) {
    mapMsg = "";
    if (status === "done") {
      if (test) {
        mapMsg = "Bạn đã làm bài test này rồi.";
        mapPick = null;
      } else mapPick = n - 1;
    } else if (status === "current") {
      mapPick = null;
      start("vocab"); // buổi hôm nay: học luôn
      return;
    } else if (status === "ready") {
      startTest();
      return;
    } else {
      mapPick = null;
      mapMsg = test
        ? "Học đủ " + (n - 1) + " buổi để mở bài test này nhé."
        : "Hoàn thành các buổi trước để mở buổi " + n + ".";
    }
    render();
  }

  /* ---------- Cài đặt: bật/tắt phát âm và xóa tiến độ học ---------- */
  function renderSettings() {
    st.settings = st.settings || {};
    const card = el("section", "study-today");
    card.append(el("h3", "study-h", "Cài đặt"));

    /* Công tắc bật/tắt kiểu iOS */
    const switchEl = (on, onChange) => {
      const lab = el("label", "study-switch");
      const input = el("input");
      input.type = "checkbox";
      input.checked = on;
      input.addEventListener("change", () => onChange(input.checked));
      lab.append(input, el("span", "study-switch-track"));
      return lab;
    };

    const row = el("div", "study-setting");
    row.append(
      el("span", null, "Phát âm tiếng Nhật"),
      switchEl(st.settings.sound !== false, (on) => {
        st.settings.sound = on;
        save();
      })
    );

    const musicRow = el("div", "study-setting");
    musicRow.append(
      el("span", null, "Nhạc nền"),
      switchEl(st.settings.music !== false, (on) => {
        st.settings.music = on;
        save();
        if (on) playStudyMusic();
        else stopStudyMusic();
      })
    );

    const reset = el("button", "secondary full", "Xóa toàn bộ tiến độ học");
    reset.type = "button";
    reset.addEventListener("click", () => {
      if (!window.confirm("Xóa toàn bộ tiến độ học N1? Không thể hoàn tác.")) return;
      st.learned = {};
      st.days = {};
      st.hist = {};
      st.today = null;
      st.testBlock = 0;
      st.starred = {};
      save();
      view = "home";
      render();
    });

    card.append(row, musicRow, reset);
    body.append(card);
  }

  /* ---------- Nhân vật chào khi bấm "Đi học thôi nào!" ---------- */
  const welcome = $("#study-welcome");
  const welcomeOk = $("#study-welcome-ok");
  const welcomeLater = $("#study-welcome-later");
  let welcomeAction = null;

  function chosenChar() {
    try {
      const s = JSON.parse(localStorage.getItem("bepque.v1"));
      return s && (s.char === "boy" || s.char === "girl") ? s.char : null;
    } catch (e) {
      return null;
    }
  }
  const CHEER = [
    "Hôm nay mình cùng cố gắng nào!",
    "Chào bạn! Hôm nay chúng mình cùng cố gắng nhé!",
    "Mỗi ngày một chút, mình sẽ giỏi lên thôi. Cố gắng nào!",
  ];
  function showStudyWelcome() {
    const c = chosenChar();
    if (!c) return;
    const ready = testReady();
    const doneToday = !!st.days[dateKey(new Date())];
    let text = CHEER[Math.floor(Math.random() * CHEER.length)];
    if (ready) text = "Bạn đã học đủ 7 ngày rồi! Mình làm bài test nhỏ nhé?";
    else if (doneToday) text = "Hôm nay bạn đã học rồi, giỏi quá! Học thêm chút nữa nhé?";
    else if (streak() > 0) text += " Bạn đã học " + streak() + " ngày liền rồi, đừng để đứt nhé!";

    $("#study-welcome-char").src = "assets/" + c + ".png";
    $("#study-welcome-text").textContent = text;
    welcomeLater.hidden = !ready;
    welcomeOk.textContent = ready ? "Làm test luôn" : "Học thôi!";
    welcomeAction = ready ? startTest : null;
    welcome.hidden = false;
  }
  welcomeOk.addEventListener("click", () => {
    welcome.hidden = true;
    if (welcomeAction) welcomeAction();
    welcomeAction = null;
  });
  welcomeLater.addEventListener("click", () => {
    welcome.hidden = true;
    welcomeAction = null;
  });

  /* ---------- Gắn sự kiện ---------- */
  function openN1() {
    showStudy(true);
    playStudyMusic(); // bấm mở Luyện N1 là một lần chạm nên trình duyệt cho phép phát
    view = "home";
    render();
    showStudyWelcome();
  }
  const langPick = $("#lang-pick");
  $("#btn-study").addEventListener("click", () => {
    if (langPick) langPick.hidden = false; // chọn tiếng Anh (TOEIC) hay tiếng Nhật (N1)
    else openN1();
  });
  if (langPick) {
    $("#lang-n1").addEventListener("click", () => {
      langPick.hidden = true;
      openN1();
    });
    $("#lang-cancel").addEventListener("click", () => {
      langPick.hidden = true;
    });
  }
  $("#study-back").addEventListener("click", () => {
    if (view !== "home") {
      // Đang luyện (từ vựng, ngữ pháp, bài đọc, test, kết quả) thì quay về trang luyện N1
      stopAuto();
      todayOpen = false;
      view = "home";
      render();
      return;
    }
    showStudy(false); // đang ở trang luyện N1 thì mới thoát ra trang chủ
  });
  function toggleToday(tab) {
    if (todayOpen && todayTab === tab) todayOpen = false; // bấm lại đúng nút đang mở thì đóng
    else {
      todayOpen = true;
      todayTab = tab;
    }
    renderTodayPanel();
  }
  todayBtn.addEventListener("click", () => toggleToday("words"));
  chartBtn.addEventListener("click", () => toggleToday("chart"));
  mapBtn.addEventListener("click", () => {
    todayOpen = false;
    mapPick = null;
    mapMsg = "";
    view = "map";
    render();
  });
  settingsBtn.addEventListener("click", () => {
    todayOpen = false;
    view = "settings";
    render();
  });
})();