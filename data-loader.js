/* Nạp dữ liệu học (N1 từ vựng, ngữ pháp, đọc hiểu, TOEIC) từ Supabase,
   rồi mới chạy study.js và toeic.js (hai file này đọc thẳng các biến window.*).
   - Dùng REST của Supabase (PostgREST), không cần thư viện.
   - Có lưu cache trong localStorage: mất mạng thì dùng bản cache lần trước. */
(function () {
  "use strict";
  var URL_ = window.SUPABASE_URL, KEY = window.SUPABASE_ANON_KEY;
  var CACHE_KEY = "kotoba.data.v1";
  var PAGE = 1000; // PostgREST mặc định chỉ trả tối đa 1000 dòng / lần → phải phân trang

  function fetchAll(table, columns) {
    var rows = [];
    function next(from) {
      return fetch(URL_ + "/rest/v1/" + table + "?select=" + columns + "&order=sort_order.asc", {
        headers: {
          apikey: KEY,
          Authorization: "Bearer " + KEY,
          Range: from + "-" + (from + PAGE - 1),
          "Range-Unit": "items"
        }
      }).then(function (res) {
        if (!res.ok) throw new Error(table + ": HTTP " + res.status);
        return res.json();
      }).then(function (part) {
        rows = rows.concat(part);
        return part.length === PAGE ? next(from + PAGE) : rows;
      });
    }
    return next(0);
  }

  function fromSupabase() {
    if (!URL_ || !KEY || /YOUR-/.test(URL_ + KEY)) return Promise.reject(new Error("Chưa cấu hình Supabase"));
    return Promise.all([
      fetchAll("n1_vocab", "w,r,m"),
      fetchAll("n1_grammar", "s,opts,a,note"),
      fetchAll("n1_reading", "title,body,qs"),
      fetchAll("toeic_vocab", "w,p,vi,ja,ex")
    ]).then(function (r) {
      return {
        vocab: r[0].map(function (x) { var o = { w: x.w, m: x.m }; if (x.r) o.r = x.r; return o; }),
        grammar: r[1],
        reading: r[2].map(function (x) { return { title: x.title, text: x.body, qs: x.qs }; }),
        toeic: r[3]
      };
    });
  }

  function apply(d) {
    window.N1_VOCAB_BOOK = d.vocab;
    window.N1_GRAMMAR_BOOK = d.grammar;
    window.N1_READING_BOOK = d.reading;
    window.TOEIC_VOCAB = d.toeic;
  }

  function loadScript(src) {
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = s.onerror = resolve;
      document.body.appendChild(s);
    });
  }

  fromSupabase()
    .then(function (d) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) {}
      return d;
    })
    .catch(function (err) {
      console.warn("[data-loader] Không tải được từ Supabase, dùng cache:", err.message);
      try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; }
    })
    .then(function (d) {
      if (d) apply(d);
      else console.error("[data-loader] Không có dữ liệu học (Supabase lỗi và chưa có cache).");
      // Thứ tự quan trọng: study.js trước, toeic.js sau
      return loadScript("study.js?v=settings-fix").then(function () { return loadScript("toeic.js"); });
    });
})();
