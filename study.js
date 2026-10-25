(function () {
  "use strict";
  const D = window.N1_DATA;
  if (!D) return;

  const KEY = "bepque.n1.v1";
  const SIZE = { vocab: 20, grammar: 5 };

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
      const stamp = el("span", "study-stamp" + (done ? " on" : ""), done ? "✓" : "");
      stamp.style.left = (CHART.cols[i % 6] / CHART.w) * 100 + "%";
      stamp.style.top = (CHART.rows[Math.floor(i / 6)] / CHART.h) * 100 + "%";
      wrap.append(stamp);
    }
    return wrap;
  }

  /* ---------- Từ vựng: mỗi buổi chọn ngẫu nhiên 20 từ chưa thuộc ---------- */
  function startVocab() {
    const all = allVocab();
    const fresh = all.filter((v) => !st.learned[v.w]);
    const picked = shuffle(fresh.length ? fresh : all).slice(0, SIZE.vocab);
    const k = dateKey(new Date());
    if (!st.today || st.today.date !== k) st.today = { date: k, words: [] };
    picked.forEach((v) => {
      if (!st.today.words.includes(v.w)) st.today.words.push(v.w);
    });
    save();
    return picked;
  }

  /* Các từ đã học trong ngày (từ các buổi hôm nay) */
  function todayVocab() {
    const k = dateKey(new Date());
    if (!st.today || st.today.date !== k) return [];
    const byWord = new Map(allVocab().map((v) => [v.w, v]));
    return st.today.words.map((w) => byWord.get(w)).filter(Boolean);
  }

  /* ---------- Bài học hôm nay theo từng mục ---------- */
  function planFor(section) {
    const d = dayNum();
    if (section === "vocab") return startVocab();
    if (section === "grammar") {
      return pick(D.grammar, SIZE.grammar, (d * SIZE.grammar) % D.grammar.length);
    }
    return D.reading.length ? [D.reading[d % D.reading.length]] : [];
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

  /* ---------- Khung màn hình ---------- */
  const screen = $("#study");
  const body = $("#study-body");
  const todayBtn = $("#study-today");
  const todayPanel = $("#study-today-panel");
  let view = "home"; // home | vocab | grammar | reading | done
  let addOpen = false;
  let todayOpen = false;
  let flash = "";
  let sess = null;

  function showStudy(on) {
    if (!on) stopAuto();
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
    };
    views[view]();
    renderTodayPanel();
  }

  /* ---------- Danh sách từ đã học hôm nay ---------- */
  let todayTab = "chart"; // chart | words
  function renderTodayPanel() {
    todayPanel.hidden = !todayOpen;
    body.hidden = todayOpen;
    todayBtn.classList.toggle("open", todayOpen);
    todayBtn.setAttribute("aria-expanded", String(todayOpen));
    if (!todayOpen) return;
    todayPanel.textContent = "";

    const tabs = el("div", "study-tabs");
    [
      ["chart", "Phiếu bé ngoan"],
      ["words", "Từ vựng hôm nay"],
    ].forEach(([key, label]) => {
      const b = el("button", "study-tab" + (todayTab === key ? " on" : ""), label);
      b.type = "button";
      b.setAttribute("aria-pressed", String(todayTab === key));
      b.addEventListener("click", () => {
        todayTab = key;
        renderTodayPanel();
      });
      tabs.append(b);
    });
    todayPanel.append(tabs);

    if (todayTab === "chart") {
      todayPanel.append(stickerChart());
      return;
    }

    const words = todayVocab();
    todayPanel.append(el("h3", "study-h", "Từ vựng đã học hôm nay (" + words.length + ")"));
    if (!words.length) todayPanel.append(el("p", "study-sub", "Chưa có từ nào. Hãy bắt đầu một buổi từ vựng."));
    words.forEach((x) => {
      const done = !!st.learned[x.w];
      const row = el("div", "study-today-row " + (done ? "ok" : ""));
      row.append(
        el("b", null, x.w + (x.r ? "（" + x.r + "）" : "")),
        el("span", null, x.m),
        el("i", null, done ? "✓" : "")
      );
      todayPanel.append(row);
    });

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
    sess = { section, items: planFor(section), i: 0, score: 0, total: 0 };
    view = section;
    render();
  }

  /* ---------- Từ vựng: gõ từ tiếng Nhật theo nghĩa ---------- */
  let autoTimer = null;
  function stopAuto() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = null;
  }

  function renderVocab() {
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
        result.textContent = "Chưa đúng. Đáp án: " + ans + ". Hãy nhập lại từ đúng.";
        result.classList.remove("ok");
        result.classList.add("bad");
        result.hidden = false;
        input.value = "";
        input.focus();
        return;
      }
      // Đúng: ghi nhận lần đầu, rồi tự chuyển sau 5 giây
      if (attempts === 1) {
        sess.total++;
        sess.score++;
        st.learned[item.w] = true;
        save();
      }
      result.textContent = "Đúng! " + ans;
      result.classList.remove("bad");
      result.classList.add("ok");
      result.hidden = false;
      input.disabled = true;
      check.hidden = true;
      hint.hidden = true;
      nextBtn.hidden = false;
      let left = 5;
      nextBtn.textContent = "Tiếp (" + left + ")";
      stopAuto();
      autoTimer = setInterval(() => {
        left--;
        if (left <= 0) goNext();
        else nextBtn.textContent = "Tiếp (" + left + ")";
      }, 1000);
    });

    setTimeout(() => input.focus(), 0);
  }

  /* ---------- Ngữ pháp ---------- */
  function renderGrammar() {
    const list = sess.items;
    const q = list[sess.i];
    body.append(
      el("p", "study-sub", "Ngữ pháp " + (sess.i + 1) + "/" + list.length),
      progressBar(sess.i, list.length),
      el("div", "study-card study-q", q.s)
    );
    const correct = q.opts[q.a];
    const box = el("div", "study-opts");
    const note = el("p", "study-note");
    note.hidden = true;
    const nextBtn = el("button", "primary full", sess.i + 1 < list.length ? "Câu tiếp" : "Xong");
    nextBtn.type = "button";
    nextBtn.hidden = true;

    shuffle(q.opts).forEach((o) => {
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
        note.textContent = (ok ? "Đúng. " : "Chưa đúng, đáp án là " + correct + ". ") + q.note;
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
      shuffle(q.opts).forEach((o) => {
        const b = el("button", "study-opt", o);
        b.type = "button";
        b.addEventListener("click", () => {
          if (box.dataset.done) return;
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
    if (sess.i >= sess.items.length) {
      st.days[dateKey(new Date())] = true;
      save();
      view = "done";
    }
    render();
  }

  function renderDone() {
    const pct = sess.total ? Math.round((sess.score / sess.total) * 100) : 0;
    const card = el("div", "study-done");
    card.append(
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

  /* ---------- Gắn sự kiện ---------- */
  $("#btn-study").addEventListener("click", () => {
    showStudy(true);
    view = "home";
    render();
  });
  $("#study-back").addEventListener("click", () => showStudy(false));
  todayBtn.addEventListener("click", () => {
    todayOpen = !todayOpen;
    renderTodayPanel();
  });
})();
