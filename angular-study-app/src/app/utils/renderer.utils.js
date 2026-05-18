/**
 * renderer.utils.js — HTML rendering helpers + fuzzy search
 * Exposes: window.App.Utils.{ esc, md, codeBlock, fuzzyMatch, fuzzyHL, fuzzyScore }
 * Load after: core/signal.js, core/injector.js
 */
(function () {
  "use strict";
  window.App = window.App || {};

  /* ── HTML escape ──────────────────────────────────────────────── */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]
    );
  }

  /* ── Tiny markdown: **bold**, `code`, lists, paragraphs ───────── */
  function md(text) {
    if (!text) return "";
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    let html = "", inList = false;
    const inline = (s) =>
      esc(s)
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/_([^_]+)_/g, "<em>$1</em>");

    for (const raw of lines) {
      const line = raw.trim();
      if (/^[-*]\s+/.test(line)) {
        if (!inList) { html += "<ul>"; inList = true; }
        html += "<li>" + inline(line.replace(/^[-*]\s+/, "")) + "</li>";
      } else if (!line) {
        if (inList) { html += "</ul>"; inList = false; }
      } else {
        if (inList) { html += "</ul>"; inList = false; }
        html += "<p>" + inline(line) + "</p>";
      }
    }
    if (inList) html += "</ul>";
    return html;
  }

  /* ── Syntax-highlighted code block ───────────────────────────── */
  function codeBlock(lang, code) {
    const cls = "language-" + (lang || "none");
    return `
      <div class="code-head">
        <span class="lang">${esc(lang || "code")}</span>
        <button class="copy" data-copy>Copy</button>
      </div>
      <pre class="${cls}"><code class="${cls}">${esc(code)}</code></pre>`;
  }

  /* ── Fuzzy search ─────────────────────────────────────────────── */
  function fuzzyMatch(text, query) {
    if (!query) return { match: true, score: 0, indices: [] };
    const t = text.toLowerCase(), q = query.toLowerCase();
    let ti = 0, qi = 0;
    const indices = [];
    while (ti < t.length && qi < q.length) {
      if (t[ti] === q[qi]) { indices.push(ti); qi++; }
      ti++;
    }
    if (qi < q.length) return { match: false };
    const bonus = indices.reduce(
      (acc, idx, i) => acc + (i > 0 && idx === indices[i - 1] + 1 ? 2 : 0), 0
    );
    return { match: true, score: qi + bonus, indices };
  }

  function fuzzyHL(text, indices) {
    if (!indices || !indices.length) return esc(text);
    let r = "", inM = false;
    for (let i = 0; i < text.length; i++) {
      const hit = indices.includes(i);
      if (hit && !inM) { r += "<mark class=\"fz-hl\">"; inM = true; }
      if (!hit && inM) { r += "</mark>"; inM = false; }
      r += esc(text[i]);
    }
    return inM ? r + "</mark>" : r;
  }

  function fuzzyScore(topic, q) {
    if (!q) return { match: true, score: 0, titleHl: esc(topic.title) };
    const titleM = fuzzyMatch(topic.title, q);
    if (titleM.match) return { match: true, score: titleM.score + 20, titleHl: fuzzyHL(topic.title, titleM.indices) };
    const tagM = fuzzyMatch(topic.tag || "", q);
    if (tagM.match && q.length >= 2) return { match: true, score: tagM.score + 10, titleHl: esc(topic.title) };
    const tagsHit = (topic.tags || []).some(tg => fuzzyMatch(tg, q).match);
    if (tagsHit && q.length >= 2) return { match: true, score: 5, titleHl: esc(topic.title) };
    const areaM = fuzzyMatch(topic.area, q);
    if (areaM.match && q.length >= 2) return { match: true, score: 1, titleHl: esc(topic.title) };
    return { match: false };
  }

  window.App.Utils = { esc, md, codeBlock, fuzzyMatch, fuzzyHL, fuzzyScore };
})();
