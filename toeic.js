/* Luyện TOEIC — mỗi ngày 10 từ (7 từ mới + 3 từ đến hạn ôn), ôn lại theo khoảng cách tăng dần.
   Dữ liệu từ: toeic-data.js (window.TOEIC_VOCAB). Dùng lại các class study-* của Luyện N1. */
(function () {
  "use strict";
  const V = window.TOEIC_VOCAB;
  if (!Array.isArray(V) || !V.length) return;

  const KEY = "bepque.toeic.v1";
  const SIZE = 10; // số từ mỗi buổi
  const NEW_MAX = 7; // tối đa từ mới mỗi buổi, còn lại dành cho từ cần ôn
  const GAP = [0, 1, 3, 7, 14, 30, 60]; // số ngày chờ theo từng bậc (bậc 1 = ôn lại sau 1 ngày...)
  const MAX_BOX = GAP.length - 1;

  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  const dayNum = () =>
    Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /* ---------- Lưu trữ ---------- */
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
      /* trình duyệt chặn thì bỏ qua */
    }
  }
  const st = load();
  st.w = st.w && typeof st.w === "object" ? st.w : {}; // từ -> { b: bậc nhớ, d: ngày đến hạn ôn }
  st.days = st.days && typeof st.days === "object" ? st.days : {}; // số ngày -> đã học

  const byWord = new Map(V.map((v) => [v.w, v]));
  const boxOf = (w) => (st.w[w] ? st.w[w].b : 0);
  const streak = () => {
    let n = 0;
    let d = dayNum();
    if (!st.days[d]) d--; // hôm nay chưa học thì vẫn tính chuỗi của hôm qua
    while (st.days[d]) {
      n++;
      d--;
    }
    return n;
  };

  /* ---------- Phát âm (tôn trọng cài đặt âm thanh của Luyện N1) ---------- */
  function soundOn() {
    try {
      const n1 = JSON.parse(localStorage.getItem("bepque.n1.v1"));
      return !(n1 && n1.settings && n1.settings.sound === false);
    } catch (e) {
      return true;
    }
  }
  function speak(text, rate) {
    try {
      if (!("speechSynthesis" in window) || !text || !soundOn()) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = rate || 0.9;
      const voice = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
      if (voice) u.voice = voice;
      window.speechSynthesis.speak(u);
    } catch (e) {
      /* bỏ qua */
    }
  }

  /* ---------- Lập kế hoạch buổi học ---------- */
  function dueWords() {
    const t = dayNum();
    return V.filter((v) => st.w[v.w] && st.w[v.w].d <= t).sort(
      (a, b) => st.w[a.w].d - st.w[b.w].d || st.w[a.w].b - st.w[b.w].b
    );
  }
  const freshWords = () => V.filter((v) => !st.w[v.w]);
  function plan() {
    const due = dueWords();
    const fresh = freshWords();
    let nNew = Math.min(fresh.length, NEW_MAX);
    const nDue = Math.min(due.length, SIZE - nNew);
    nNew = Math.min(fresh.length, SIZE - nDue); // thiếu từ cần ôn thì bù bằng từ mới
    return { fresh: fresh.slice(0, nNew), due: due.slice(0, nDue) };
  }

  /* ---------- Dạng câu hỏi theo bậc nhớ ---------- */
  const kindFor = (box) => (box <= 0 ? "choice" : box === 1 ? "blank" : box === 2 ? "type" : "listen");
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
  const maskSentence = (v) =>
    v.ex.replace(new RegExp("\\b" + v.w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i"), "＿＿＿＿");

  function distractors(v, field, n) {
    const seen = new Set([v[field]]);
    const out = [];
    shuffle(V).forEach((x) => {
      if (out.length >= n || x.w === v.w || seen.has(x[field])) return;
      seen.add(x[field]);
      out.push(x[field]);
    });
    return out;
  }
  function wordOptions(v) {
    const same = shuffle(V.filter((x) => x.w !== v.w && x.p === v.p)).map((x) => x.w);
    const rest = shuffle(V.filter((x) => x.w !== v.w && x.p !== v.p)).map((x) => x.w);
    return shuffle([v.w].concat(same.concat(rest).slice(0, 3)));
  }

  /* ---------- Màn hình ---------- */
  const screen = $("#toeic");
  const body = $("#toeic-body");
  if (!screen || !body) return;

  let view = "home"; // home | learn | quiz | done | list
  let sess = null;

  function progressBar(cur, total) {
    const wrap = el("div", "study-bar");
    const fill = el("span");
    fill.style.width = (total ? (cur / total) * 100 : 0) + "%";
    wrap.append(fill);
    return wrap;
  }
  function speakBtn(text, label) {
    const b = el("button", "study-speak-mini", "🔊");
    b.type = "button";
    b.setAttribute("aria-label", label || "Nghe");
    b.addEventListener("click", () => speak(text));
    return b;
  }

  function show(on) {
    screen.hidden = !on;
    $("#start").hidden = on;
    if (!on) {
      try {
        window.speechSynthesis && window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }

  function render() {
    body.textContent = "";
    ({ home: renderHome, learn: renderLearn, quiz: renderQuiz, done: renderDone, list: renderList }[view])();
    body.scrollTop = 0;
  }

  /* ----- Trang chính ----- */
  function renderHome() {
    const learned = Object.keys(st.w).length;
    const solid = Object.keys(st.w).filter((w) => st.w[w].b >= 4).length;
    const doneToday = !!st.days[dayNum()];
    const p = plan();

    const hero = el("section", "study-hero");
    const chips = el("div", "study-chips");
    chips.append(
      el("span", "study-chip", "Chuỗi " + streak() + " ngày"),
      el("span", "study-chip " + (doneToday ? "done" : "soft"), doneToday ? "Đã học hôm nay" : "Chưa học hôm nay")
    );
    hero.append(
      chips,
      el("p", "study-hero-title", "Đã gặp " + learned + " / " + V.length + " từ"),
      progressBar(learned, V.length),
      el("p", "study-sub", "Nhớ chắc: " + solid + " từ")
    );
    body.append(hero);

    body.append(el("h3", "study-h", "Hôm nay"));
    const total = p.fresh.length + p.due.length;
    if (!total) {
      body.append(el("p", "study-sub", "Bạn đã học hết kho từ hiện có và chưa có từ nào đến hạn ôn. Hẹn bạn ngày mai nhé!"));
    } else {
      body.append(
        el(
          "p",
          "study-sub",
          p.fresh.length + " từ mới + " + p.due.length + " từ cần ôn lại (" + total + " từ)"
        )
      );
      const go = el("button", "primary full", doneToday ? "Học thêm" : "Bắt đầu học");
      go.type = "button";
      go.addEventListener("click", startSession);
      body.append(go);
    }

    const list = el("button", "study-add-toggle", "Xem danh sách từ đã học");
    list.type = "button";
    list.addEventListener("click", () => {
      view = "list";
      render();
    });
    body.append(list);
    body.append(
      el(
        "p",
        "study-sub",
        "Từ trả lời đúng sẽ quay lại sau 1, 3, 7, 14, 30 ngày. Từ trả lời sai sẽ quay lại sớm hơn."
      )
    );
  }

  /* ----- Danh sách từ đã học ----- */
  function renderList() {
    const words = Object.keys(st.w)
      .map((w) => byWord.get(w))
      .filter(Boolean);
    body.append(el("h3", "study-h", "Từ đã học (" + words.length + ")"));
    if (!words.length) body.append(el("p", "study-sub", "Chưa có từ nào. Hãy bắt đầu buổi học đầu tiên nhé!"));
    words.forEach((v) => {
      const row = el("div", "study-wrong-row");
      const top = el("div");
      top.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:8px";
      const left = el("b", null, v.w + "  (" + v.p + ")");
      top.append(left, speakBtn(v.w, "Nghe " + v.w));
      row.append(top, el("span", null, v.vi + " · " + v.ja), el("span", null, "Bậc nhớ " + boxOf(v.w) + "/" + MAX_BOX));
      body.append(row);
    });
    const back = el("button", "secondary full", "Quay lại");
    back.type = "button";
    back.addEventListener("click", () => {
      view = "home";
      render();
    });
    body.append(back);
  }

  /* ----- Bắt đầu buổi học ----- */
  function startSession() {
    const p = plan();
    const items = p.fresh.concat(p.due);
    if (!items.length) return;
    sess = {
      learn: p.fresh.slice(),
      li: 0,
      queue: shuffle(items).map((v) => ({ v, tries: 0, retry: false })),
      total: items.length,
      score: 0,
      resolved: 0,
      wrong: [],
    };
    view = sess.learn.length ? "learn" : "quiz";
    render();
  }

  /* ----- Thẻ từ mới ----- */
  function renderLearn() {
    const v = sess.learn[sess.li];
    body.append(
      el("p", "study-sub", "Từ mới " + (sess.li + 1) + "/" + sess.learn.length),
      progressBar(sess.li, sess.learn.length)
    );
    const card = el("div", "study-card");
    const head = el("div", "study-mean", v.w);
    head.style.fontSize = "34px";
    const row = el("div");
    row.style.cssText = "display:flex;justify-content:center;align-items:center;gap:10px;margin-bottom:6px";
    row.append(head, speakBtn(v.w, "Nghe " + v.w));
    const meaning = el("div", "study-mean", v.vi);
    const ja = el("div", "study-hint", v.ja + "  ·  " + v.p);
    const ex = el("div", "study-note", v.ex);
    ex.style.cssText = "margin-top:14px;background:rgba(0,0,0,.06);color:inherit;text-align:left";
    card.append(row, meaning, ja, ex, speakBtn(v.ex, "Nghe câu ví dụ"));
    card.lastChild.style.marginTop = "10px";
    body.append(card);
    speak(v.w);

    const last = sess.li + 1 >= sess.learn.length;
    const next = el("button", "primary full", last ? "Làm bài tập" : "Từ tiếp theo");
    next.type = "button";
    next.addEventListener("click", () => {
      sess.li++;
      if (sess.li >= sess.learn.length) view = "quiz";
      render();
    });
    body.append(next);
  }

  /* ----- Bài tập ----- */
  function resolve(item, ok) {
    // Chấm điểm bậc nhớ ở lần trả lời đầu tiên của mỗi từ
    if (item.tries === 0) {
      const t = dayNum();
      const cur = boxOf(item.v.w);
      const nb = ok ? Math.min(cur + 1, MAX_BOX) : 1;
      st.w[item.v.w] = { b: nb, d: t + GAP[nb] };
      sess.resolved++;
      if (ok) sess.score++;
      else sess.wrong.push(item.v);
      save();
    }
    if (!ok) {
      item.tries++;
      item.retry = true; // làm lại ở cuối buổi bằng câu trắc nghiệm cho dễ nhớ
      sess.queue.push(item);
    }
  }

  function renderQuiz() {
    if (!sess.queue.length) {
      st.days[dayNum()] = true;
      save();
      view = "done";
      render();
      return;
    }
    const item = sess.queue[0];
    const v = item.v;
    const kind = item.retry ? "choice" : kindFor(boxOf(v.w));
    body.append(
      el("p", "study-sub", "Đã xong " + sess.resolved + "/" + sess.total + " từ"),
      progressBar(sess.resolved, sess.total)
    );

    const note = el("p", "study-note");
    note.hidden = true;
    const next = el("button", "primary full", "Tiếp");
    next.type = "button";
    next.hidden = true;
    next.addEventListener("click", () => {
      sess.queue.shift();
      render();
    });

    const feedback = (ok, extra) => {
      note.textContent = (ok ? "Đúng! " : "Chưa đúng. Đáp án: " + v.w + ". ") + v.vi + " · " + v.ja + "\n" + v.ex;
      note.style.whiteSpace = "pre-line";
      note.classList.toggle("ok", ok);
      note.classList.toggle("bad", !ok);
      note.hidden = false;
      next.hidden = false;
      speak(v.w);
      if (extra) extra();
    };

    const card = el("div", "study-card");
    body.append(card);

    if (kind === "choice" || kind === "blank") {
      let options, correct, prompt;
      if (kind === "choice") {
        const lang = Math.random() < 0.5 ? "vi" : "ja";
        correct = v[lang];
        options = shuffle([correct].concat(distractors(v, lang, 3)));
        const head = el("div", "study-mean", v.w);
        head.style.fontSize = "30px";
        const row = el("div");
        row.style.cssText = "display:flex;justify-content:center;align-items:center;gap:10px";
        row.append(head, speakBtn(v.w, "Nghe " + v.w));
        card.append(row, el("div", "study-hint", lang === "vi" ? "Chọn nghĩa tiếng Việt" : "日本語の意味を選ぼう"));
        if (!item.retry) speak(v.w);
      } else {
        correct = v.w;
        options = wordOptions(v);
        prompt = el("div", "study-mean", maskSentence(v));
        prompt.style.fontSize = "19px";
        card.append(prompt, el("div", "study-hint", "Điền từ thích hợp · gợi ý: " + v.vi));
      }
      const box = el("div", "study-opts");
      options.forEach((o) => {
        const b = el("button", "study-opt", o);
        b.type = "button";
        b.addEventListener("click", () => {
          const ok = o === correct;
          box.querySelectorAll("button").forEach((x) => (x.disabled = true));
          b.classList.add(ok ? "ok" : "bad");
          if (!ok) [...box.querySelectorAll("button")].find((x) => x.textContent === correct)?.classList.add("ok");
          resolve(item, ok);
          feedback(ok);
        });
        box.append(b);
      });
      body.append(box, note, next);
      return;
    }

    // Dạng gõ từ: "type" (nhìn nghĩa) hoặc "listen" (nghe rồi gõ)
    if (kind === "type") {
      const m = el("div", "study-mean", v.vi);
      card.append(m, el("div", "study-hint", v.ja + " · " + v.p), el("div", "study-hint", "Gõ từ tiếng Anh"));
    } else {
      const row = el("div");
      row.style.cssText = "display:flex;justify-content:center;gap:12px";
      const big = speakBtn(v.w, "Nghe lại");
      big.style.cssText += "width:64px;height:64px;font-size:30px";
      const slow = el("button", "study-speak-mini", "🐢");
      slow.type = "button";
      slow.setAttribute("aria-label", "Nghe chậm");
      slow.style.cssText += "width:64px;height:64px;font-size:30px";
      slow.addEventListener("click", () => speak(v.w, 0.5));
      row.append(big, slow);
      card.append(row, el("div", "study-hint", "Nghe rồi gõ từ bạn nghe được"));
      setTimeout(() => speak(v.w), 250);
    }
    const hintTxt = el("div", "study-hint-txt");
    card.append(hintTxt);

    const form = el("form", "study-typing");
    const input = el("input", "study-input");
    input.type = "text";
    input.lang = "en";
    input.autocomplete = "off";
    input.autocapitalize = "off";
    input.spellcheck = false;
    input.setAttribute("aria-label", "Từ tiếng Anh");
    const hint = el("button", "secondary", "Gợi ý");
    hint.type = "button";
    hint.addEventListener("click", () => {
      hintTxt.textContent = "Bắt đầu bằng「" + v.w[0] + "」, gồm " + v.w.replace(/ /g, "").length + " chữ cái";
      if (kind === "listen") hintTxt.textContent += " · nghĩa: " + v.vi;
    });
    const check = el("button", "primary", "Kiểm tra");
    check.type = "submit";
    form.append(input, hint, check);
    body.append(form, note, next);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      const ok = norm(val) === norm(v.w);
      input.disabled = true;
      check.hidden = true;
      hint.hidden = true;
      resolve(item, ok);
      feedback(ok);
    });
    setTimeout(() => input.focus(), 0);
  }

  /* ----- Kết quả buổi học ----- */
  function renderDone() {
    const pct = sess.total ? Math.round((sess.score / sess.total) * 100) : 0;
    const msg =
      pct >= 80
        ? "Tuyệt vời! Bạn nhớ bài rất tốt."
        : pct >= 50
        ? "Khá lắm! Những từ sai sẽ sớm quay lại để bạn ôn."
        : "Đừng nản nhé, lặp lại nhiều lần là nhớ thôi!";
    const card = el("div", "study-done");
    card.append(
      el("h3", "study-h", "Hoàn thành buổi học!"),
      el("div", "study-score", sess.score + "/" + sess.total),
      el("p", "study-sub", "từ đúng ngay lần đầu · " + pct + "%"),
      el("p", "study-stat", msg),
      el("p", "study-stat", "Chuỗi " + streak() + " ngày")
    );
    if (sess.wrong.length) {
      card.append(el("p", "study-stat", "Cần ôn lại:"));
      sess.wrong.forEach((v) => {
        const row = el("div", "study-wrong-row");
        row.append(el("b", null, v.w), el("span", null, v.vi + " · " + v.ja));
        card.append(row);
      });
    }
    body.append(card);
    if (plan().fresh.length + plan().due.length) {
      const more = el("button", "primary full", "Học thêm");
      more.type = "button";
      more.addEventListener("click", startSession);
      body.append(more);
    }
    const home = el("button", "secondary full", "Về trang TOEIC");
    home.type = "button";
    home.addEventListener("click", () => {
      view = "home";
      render();
    });
    body.append(home);
  }

  /* ---------- Gắn sự kiện ---------- */
  window.openToeic = function () {
    show(true);
    view = "home";
    render();
  };
  $("#toeic-back").addEventListener("click", () => {
    if (view !== "home") {
      view = "home";
      render();
      return;
    }
    show(false);
  });
  const pick = $("#lang-pick");
  const en = $("#lang-en");
  if (en)
    en.addEventListener("click", () => {
      if (pick) pick.hidden = true;
      window.openToeic();
    });
})();
