(function () {
  "use strict";
  const D = window.N1_DATA;
  if (!D) return;

  const KEY = "bepque.n1.v1";
  const DAILY_WORDS = 20,
    DAILY_GRAMMAR = 5;

  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  const pad = (n) => String(n).padStart(2, "0");
  const todayStr = () => {
    const d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  };
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
  function save(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {
      /* bỏ qua */
    }
  }
  let st = load();
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

  /* ---------- Bài học hôm nay ---------- */
  function todaysPlan() {
    const words = D.vocab.concat(st.custom);
    const d = dayNum();
    const grammar = D.grammar;
    const reading = D.reading;
    return {
      words: pick(words, DAILY_WORDS, (d * DAILY_WORDS) % words.length),
      grammar: pick(grammar, DAILY_GRAMMAR, (d * DAILY_GRAMMAR) % grammar.length),
      reading: reading.length ? reading[d % reading.length] : null,
    };
  }

  function streak() {
    let n = 0;
    const d = new Date();
    for (;;) {
      const key =
        d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
      if (!st.days[key]) break;
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  /* ---------- Màn hình chính của chế độ luyện N1 ---------- */
  let flash = "";
  const screen = $("#study");
  const body = $("#study-body");

  function showStudy(on) {
    screen.hidden = !on;
    $("#start").hidden = on;
  }

  function renderHome() {
    body.textContent = "";
    const total = D.vocab.length + st.custom.length;
    const learned = Object.keys(st.learned).length;
    const doneToday = !!st.days[todayStr()];

    body.append(
      el("p", "study-stat", "Đã thuộc " + learned + "/" + total + " từ · Chuỗi " + streak() + " ngày"),
      el(
        "p",
        "study-sub",
        doneToday
          ? "Hôm nay bạn đã hoàn thành. Có thể học lại để ôn tập."
          : "Hôm nay: " + DAILY_WORDS + " từ, " + DAILY_GRAMMAR + " mẫu ngữ pháp, 1 bài đọc."
      )
    );

    const go = el("button", "primary full", doneToday ? "Học lại" : "Bắt đầu hôm nay");
    go.type = "button";
    go.addEventListener("click", () => startSession());
    body.append(go);

    body.append(el("h3", "study-h", "Thêm từ mới"));
    const form = el("form", "study-form");
    const inputs = {
      w: mkInput("Từ (kanji hoặc kana)", "w"),
      r: mkInput("Cách đọc (kana)", "r"),
      m: mkInput("Nghĩa tiếng Việt", "m"),
    };
    const msg = el("p", "study-sub", flash);
    flash = "";
    const addBtn = el("button", "secondary", "Thêm vào danh sách");
    addBtn.type = "submit";
    form.append(inputs.w.wrap, inputs.r.wrap, inputs.m.wrap, addBtn, msg);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const w = inputs.w.input.value.trim(),
        r = inputs.r.input.value.trim(),
        m = inputs.m.input.value.trim();
      if (!w || !m) {
        msg.textContent = "Cần nhập ít nhất từ và nghĩa.";
        return;
      }
      st.custom.push({ w, r, m });
      save(st);
      flash = "Đã thêm. Từ này sẽ xuất hiện trong bài học sắp tới.";
      renderHome();
    });
    body.append(form);
  }

  function mkInput(label, key) {
    const wrap = el("label", "study-field");
    wrap.append(el("span", null, label));
    const input = el("input");
    input.type = "text";
    input.name = key;
    input.autocomplete = "off";
    wrap.append(input);
    return { wrap, input };
  }

  /* ---------- Buổi học: từ vựng → ngữ pháp → bài đọc ---------- */
  let session = null;

  function startSession() {
    session = { plan: todaysPlan(), step: "vocab", i: 0, gScore: 0, rScore: 0 };
    renderStep();
  }

  function progressBar(cur, total) {
    const wrap = el("div", "study-bar");
    const fill = el("span");
    fill.style.width = (total ? (cur / total) * 100 : 0) + "%";
    wrap.append(fill);
    return wrap;
  }

  function renderStep() {
    body.textContent = "";
    const s = session;
    if (s.step === "vocab") return renderVocab();
    if (s.step === "grammar") return renderGrammar();
    if (s.step === "reading") return renderReading();
    return renderDone();
  }

  function renderVocab() {
    const s = session;
    const words = s.plan.words;
    const item = words[s.i];
    body.append(
      el("p", "study-sub", "Từ vựng " + (s.i + 1) + "/" + words.length),
      progressBar(s.i, words.length)
    );
    const card = el("div", "study-card");
    card.append(el("div", "study-word", item.w));
    const hidden = el("div", "study-answer");
    hidden.hidden = true;
    hidden.append(el("div", "study-read", item.r || ""), el("div", "study-mean", item.m));
    card.append(hidden);
    body.append(card);

    const reveal = el("button", "secondary full", "Hiện nghĩa");
    reveal.type = "button";
    const actions = el("div", "study-actions");
    const forgot = el("button", "secondary", "Chưa nhớ");
    const knew = el("button", "primary", "Nhớ rồi");
    forgot.type = knew.type = "button";
    actions.append(forgot, knew);
    actions.hidden = true;

    reveal.addEventListener("click", () => {
      hidden.hidden = false;
      reveal.hidden = true;
      actions.hidden = false;
    });
    const next = (remember) => {
      if (remember && item.w) st.learned[item.w] = true;
      save(st);
      s.i++;
      if (s.i >= words.length) {
        s.step = "grammar";
        s.i = 0;
      }
      renderStep();
    };
    knew.addEventListener("click", () => next(true));
    forgot.addEventListener("click", () => next(false));

    body.append(reveal, actions);
  }

  function renderGrammar() {
    const s = session;
    const list = s.plan.grammar;
    const q = list[s.i];
    body.append(
      el("p", "study-sub", "Ngữ pháp " + (s.i + 1) + "/" + list.length),
      progressBar(s.i, list.length),
      el("div", "study-card study-q", q.s)
    );
    const correct = q.opts[q.a];
    const opts = shuffle(q.opts);
    const box = el("div", "study-opts");
    const note = el("p", "study-note");
    note.hidden = true;
    const nextBtn = el("button", "primary full", s.i + 1 < list.length ? "Câu tiếp" : "Sang bài đọc");
    nextBtn.type = "button";
    nextBtn.hidden = true;

    opts.forEach((o) => {
      const b = el("button", "study-opt", o);
      b.type = "button";
      b.addEventListener("click", () => {
        const ok = o === correct;
        if (ok) s.gScore++;
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

    nextBtn.addEventListener("click", () => {
      s.i++;
      if (s.i >= list.length) {
        s.step = "reading";
        s.i = 0;
      }
      renderStep();
    });
  }

  function renderReading() {
    const s = session;
    const rd = s.plan.reading;
    if (!rd) {
      s.step = "done";
      return renderStep();
    }
    body.append(el("p", "study-sub", "Bài đọc"), el("h3", "study-h", rd.title));
    body.append(el("div", "study-card study-text", rd.text));

    let answered = 0;
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
          if (o === correct) s.rScore++;
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
    const finishBtn = el("button", "primary full", "Hoàn thành hôm nay");
    finishBtn.type = "button";
    finishBtn.hidden = true;
    finishBtn.addEventListener("click", () => {
      s.step = "done";
      renderStep();
    });
    body.append(finishBtn);
  }

  function renderDone() {
    const s = session;
    st.days[todayStr()] = true;
    save(st);
    body.append(
      el("h3", "study-h", "Xong rồi!"),
      el(
        "p",
        "study-stat",
        "Ngữ pháp đúng " + s.gScore + "/" + s.plan.grammar.length +
          " · Bài đọc đúng " + s.rScore + "/" + (s.plan.reading ? s.plan.reading.qs.length : 0)
      ),
      el("p", "study-sub", "Chuỗi học hiện tại: " + streak() + " ngày.")
    );
    const back = el("button", "primary full", "Về trang luyện N1");
    back.type = "button";
    back.addEventListener("click", renderHome);
    body.append(back);
  }

  /* ---------- Gắn sự kiện ---------- */
  $("#btn-study").addEventListener("click", () => {
    showStudy(true);
    renderHome();
  });
  $("#study-back").addEventListener("click", () => {
    showStudy(false);
  });
})();
