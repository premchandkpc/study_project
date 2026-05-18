/**
 * topic-templates.js — area-aware section registry
 *
 * Exposes: window.TopicTemplates
 *   .buildHTML(topic, utils)  → full HTML string for the topic detail body
 *   .getSections(topic)       → ordered array of active section descriptors
 *
 * Utils shape: { esc, md, codeBlock }
 *
 * Template registry — each area maps to an ordered list of section ids.
 * Only sections whose condition(topic) returns truthy are rendered.
 */
(function () {
  'use strict';

  /* ── Section Renderers ─────────────────────────────────────────
   * Each renderer: { id, heading, condition(t), html(t, U) }
   * U = { esc, md, codeBlock }
   ──────────────────────────────────────────────────────────────── */
  var SLOTS = {};

  function def(id, heading, condition, html) {
    SLOTS[id] = { id: id, heading: heading, condition: condition, html: html };
  }

  /* 0 — System Design workbench overview */
  def('workbench', null,
    function (t) { return t.area === 'sysdesign'; },
    function (t, U) {
      var flowCount  = (t.flow  && t.flow.steps  && t.flow.steps.length)  || 0;
      var actorCount = (t.uml   && t.uml.actors  && t.uml.actors.length)  || 0;
      var archCount  = (t.architecture && t.architecture.lanes)
        ? t.architecture.lanes.reduce(function (s, l) { return s + (l.nodes || []).length; }, 0)
        : 0;
      var docs = t.docs || ('docs/topics/' + t.area + '/' + t.id + '.md');
      return '<div class="section sysdesign-overview">' +
        '<h2 id="system-design-workbench">0 \xB7 System design workbench</h2>' +
        '<div class="sysdesign-grid">' +
          '<a class="sysdesign-card" href="#interactive-flow">' +
            '<span class="sysdesign-kicker">Runtime</span>' +
            '<strong>' + (flowCount || 'Ready') + ' flow steps</strong>' +
            '<small>Play request path, async handoff, persistence, and recovery.</small>' +
          '</a>' +
          '<a class="sysdesign-card" href="#uml-sequence">' +
            '<span class="sysdesign-kicker">UML</span>' +
            '<strong>' + (actorCount || 'Ready') + ' actors</strong>' +
            '<small>Step through service-to-service messages in sequence.</small>' +
          '</a>' +
          '<a class="sysdesign-card" href="#architecture-map">' +
            '<span class="sysdesign-kicker">Architecture</span>' +
            '<strong>' + (archCount || 'Ready') + ' nodes</strong>' +
            '<small>Inspect lanes, ownership, sync paths, and async paths.</small>' +
          '</a>' +
          (t.visual ? '<a class="sysdesign-card" href="#live-diagram">' +
            '<span class="sysdesign-kicker">Canvas</span>' +
            '<strong>Live Diagram</strong>' +
            '<small>Animated VizEngine canvas — flow, layered, or swimlane view.</small>' +
          '</a>' : '') +
          '<a class="sysdesign-card docs" href="' + U.esc(docs) + '" target="_blank" rel="noreferrer">' +
            '<span class="sysdesign-kicker">Docs</span>' +
            '<strong>Open Markdown</strong>' +
            '<small>Full concept notes, Mermaid diagrams, drills, trade-offs, and gotchas.</small>' +
          '</a>' +
        '</div>' +
      '</div>';
    }
  );

  /* 0 — Interactive Flow Lab */
  def('flow', '0 \xB7 Interactive flow',
    function (t) { return t.flow && t.flow.nodes && t.flow.nodes.length && t.flow.steps && t.flow.steps.length; },
    function (t, U) {
      var flow  = t.flow;
      var first = flow.steps[0];
      var nodes = flow.nodes.map(function (node, i) {
        return '<button type="button" class="flow-node" data-node="' + U.esc(node.id) + '" style="--i:' + i + '">' +
          '<span class="node-index">' + (i + 1) + '</span>' +
          '<span class="node-label">' + U.esc(node.label) + '</span>' +
          (node.hint ? '<span class="node-hint">' + U.esc(node.hint) + '</span>' : '') +
          '</button>' +
          (i < flow.nodes.length - 1
            ? '<div class="flow-edge" data-edge="' + U.esc(node.id) + '-' + U.esc(flow.nodes[i + 1].id) + '" style="--i:' + i + '"><span></span></div>'
            : '');
      }).join('');
      return '<div class="section flow-section">' +
        '<h2 id="interactive-flow">0 \xB7 Interactive flow</h2>' +
        '<div class="flow-lab" data-flow-lab>' +
          '<div class="flow-title">' +
            '<strong>' + U.esc(flow.title || t.title) + '</strong>' +
            (flow.caption ? '<span>' + U.esc(flow.caption) + '</span>' : '') +
          '</div>' +
          '<div class="flow-stage" role="group" aria-label="' + U.esc(flow.title || t.title) + '">' + nodes + '</div>' +
          '<div class="flow-controls">' +
            '<button class="flow-btn" type="button" data-flow-prev>Prev</button>' +
            '<button class="flow-btn primary" type="button" data-flow-play>Play</button>' +
            '<button class="flow-btn" type="button" data-flow-next>Next</button>' +
            '<div class="flow-progress" aria-hidden="true"><div data-flow-progress></div></div>' +
          '</div>' +
          '<div class="flow-readout">' +
            '<strong data-flow-step-label>' + U.esc(first.label || 'Step 1') + '</strong>' +
            '<span data-flow-step-detail>' + U.esc(first.detail || '') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }
  );

  /* 0.1 — UML Sequence Lab */
  def('uml', '0.1 \xB7 UML sequence simulation',
    function (t) { return t.uml && t.uml.actors && t.uml.actors.length && t.uml.messages && t.uml.messages.length; },
    function (t, U) {
      var uml        = t.uml;
      var actorIndex = {};
      uml.actors.forEach(function (a, i) { actorIndex[a.id] = i; });
      var first  = uml.messages[0];
      var actors = uml.actors.map(function (a) {
        return '<button type="button" class="uml-actor" data-uml-actor="' + U.esc(a.id) + '">' +
          '<span>' + U.esc(a.label) + '</span>' +
          (a.hint ? '<small>' + U.esc(a.hint) + '</small>' : '') +
          '</button>';
      }).join('');
      var rows = uml.messages.map(function (msg, idx) {
        var from  = actorIndex[msg.from] != null ? actorIndex[msg.from] : 0;
        var to    = actorIndex[msg.to]   != null ? actorIndex[msg.to]   : from;
        var start = Math.min(from, to) + 1;
        var end   = Math.max(from, to) + 2;
        var rev   = from > to ? ' reverse' : '';
        var async = msg.type === 'async' ? ' async' : '';
        return '<div class="uml-row" data-uml-row="' + idx + '">' +
          uml.actors.map(function (a) {
            return '<span class="uml-lifeline" data-uml-life="' + U.esc(a.id) + '"></span>';
          }).join('') +
          '<button type="button" class="uml-message' + rev + async + '"' +
            ' data-uml-message="' + idx + '" style="grid-column:' + start + ' / ' + end + '">' +
            '<span>' + (idx + 1) + '. ' + U.esc(msg.label) + '</span>' +
          '</button>' +
        '</div>';
      }).join('');
      return '<div class="section uml-section">' +
        '<h2 id="uml-sequence">0.1 \xB7 UML sequence simulation</h2>' +
        '<div class="uml-lab" data-uml-lab>' +
          '<div class="uml-title">' +
            '<strong>' + U.esc(uml.title || t.title) + '</strong>' +
            (uml.scenario ? '<span>' + U.esc(uml.scenario) + '</span>' : '') +
          '</div>' +
          '<div class="uml-board" style="--uml-cols:' + uml.actors.length + '">' +
            '<div class="uml-actors">' + actors + '</div>' +
            '<div class="uml-timeline">' + rows + '</div>' +
          '</div>' +
          '<div class="flow-controls">' +
            '<button class="flow-btn" type="button" data-uml-prev>Prev</button>' +
            '<button class="flow-btn primary" type="button" data-uml-play>Play</button>' +
            '<button class="flow-btn" type="button" data-uml-next>Next</button>' +
            '<div class="flow-progress" aria-hidden="true"><div data-uml-progress></div></div>' +
          '</div>' +
          '<div class="uml-readout">' +
            '<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">' +
              '<strong data-uml-label style="font-size:14px;">' + U.esc(first.label || 'Message 1') + '</strong>' +
              '<span class="uml-type-badge ' + (first.async ? 'async' : 'sync') + '" data-uml-type-badge>' + (first.async ? 'async' : 'sync') + '</span>' +
            '</div>' +
            '<span data-uml-detail style="font-size:13px;color:#d3dcea;line-height:1.6;">' + U.esc(first.detail || '') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }
  );

  /* 0.2 — Architecture Map */
  def('arch', '0.2 \xB7 Architecture map',
    function (t) { return t.architecture && t.architecture.lanes && t.architecture.lanes.length; },
    function (t, U) {
      var arch      = t.architecture;
      var firstNode = (arch.lanes || []).reduce(function (acc, l) {
        return acc || (l.nodes && l.nodes[0]) || null;
      }, null) || {};
      var lanes = (arch.lanes || []).map(function (lane, li) {
        return '<div class="arch-lane" style="--lane:' + li + '">' +
          '<div class="arch-lane-title">' +
            '<span>' + U.esc(lane.label || ('Lane ' + (li + 1))) + '</span>' +
            (lane.hint ? '<small>' + U.esc(lane.hint) + '</small>' : '') +
          '</div>' +
          '<div class="arch-node-stack">' +
            (lane.nodes || []).map(function (n) {
              return '<button type="button" class="arch-node" data-arch-node="' + U.esc(n.id) + '">' +
                '<span class="arch-node-label">' + U.esc(n.label) + '</span>' +
                (n.badge ? '<span class="arch-badge">' + U.esc(n.badge) + '</span>' : '') +
                (n.hint  ? '<small>' + U.esc(n.hint) + '</small>' : '') +
                '</button>';
            }).join('') +
          '</div>' +
        '</div>';
      }).join('');
      var linkItems = (arch.links || []).map(function (link, idx) {
        return '<button type="button" class="arch-link ' + (link.type === 'async' ? 'async' : 'sync') + '"' +
          ' data-arch-link="' + idx + '" data-arch-from="' + U.esc(link.from) + '" data-arch-to="' + U.esc(link.to) + '">' +
          '<span>' + U.esc(link.label || (link.from + ' to ' + link.to)) + '</span>' +
          '<small>' + U.esc(link.type === 'async' ? 'event/async' : 'request/sync') + '</small>' +
          '</button>';
      }).join('');
      return '<div class="section arch-section">' +
        '<h2 id="architecture-map">0.2 \xB7 Architecture map</h2>' +
        '<div class="arch-lab" data-arch-lab>' +
          '<div class="arch-title">' +
            '<strong>' + U.esc(arch.title || t.title) + '</strong>' +
            (arch.caption ? '<span>' + U.esc(arch.caption) + '</span>' : '') +
          '</div>' +
          '<div class="arch-board">' +
            '<div class="arch-lanes" role="group" aria-label="' + U.esc(arch.title || t.title) + '">' + lanes + '</div>' +
            '<div class="arch-links"><strong>Paths</strong>' +
              (linkItems || '<span class="arch-empty">No paths configured.</span>') +
            '</div>' +
          '</div>' +
          '<div class="arch-readout">' +
            '<strong data-arch-label>' + U.esc(firstNode.label || 'Architecture node') + '</strong>' +
            '<span data-arch-detail>' + U.esc(firstNode.detail || firstNode.hint || 'Click a node or path to inspect.') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }
  );

  /* 0.3 — Live Canvas Diagram (VizEngine) */
  def('viz', '0.3 \xB7 Live Canvas Diagram',
    function (t) { return !!t.visual; },
    function (t) {
      return '<div class="section visual-section">' +
        '<h2 id="live-diagram">0.3 \xB7 Live Canvas Diagram</h2>' +
        '<div class="viz-mount"></div>' +
      '</div>';
    }
  );

  /* 1 — Concept */
  def('concept', '1 \xB7 Concept',
    function (t) { return !!(t.concept); },
    function (t, U) {
      return '<div class="section concept">' +
        '<h2 id="concept">1 \xB7 Concept</h2>' +
        '<div class="prose">' + U.md(t.concept || '') + '</div>' +
      '</div>';
    }
  );

  /* 2 — Why it matters */
  def('why', '2 \xB7 Why it matters (production)',
    function (t) { return !!(t.why); },
    function (t, U) {
      return '<div class="section why">' +
        '<h2 id="production-notes">2 \xB7 Why it matters (production)</h2>' +
        '<div class="prose">' + U.md(t.why || '') + '</div>' +
      '</div>';
    }
  );

  /* 3 — Code example */
  def('code', '3 \xB7 Example',
    function (t) { return !!(t.example); },
    function (t, U) {
      var ex   = t.example;
      var lang = ex.language || 'code';
      return '<div class="section code">' +
        '<h2>3 \xB7 Example — ' + U.esc(lang) + '</h2>' +
        U.codeBlock(lang, ex.code) +
        (ex.notes ? '<div class="prose" style="margin-top:8px">' + U.md(ex.notes) + '</div>' : '') +
      '</div>';
    }
  );

  /* 4 — Interview drills */
  def('interview', '4 \xB7 Interview drills',
    function (t) { return !!(t.interview && t.interview.length); },
    function (t, U) {
      var html = (t.interview || []).map(function (qa) {
        var q  = typeof qa === 'string' ? qa : (qa.question || '');
        var a  = typeof qa === 'string' ? '' : (qa.answer || '');
        var fu = typeof qa === 'object' && qa.followUps ? qa.followUps : [];
        return '<div class="qa">' +
          '<div class="q">Q. ' + U.esc(q) + '</div>' +
          (a ? '<div class="a">' + U.md(a) + '</div>' : '') +
          (fu.length ? '<div class="followups"><strong>Follow-ups:</strong> ' + fu.map(U.esc).join(' \xB7 ') + '</div>' : '') +
        '</div>';
      }).join('');
      return '<div class="section interview"><h2>4 \xB7 Interview drills</h2>' + html + '</div>';
    }
  );

  /* 5 — Trade-offs */
  def('tradeoffs', '5 \xB7 Trade-offs',
    function (t) { return !!(t.tradeoffs); },
    function (t, U) {
      var body = typeof t.tradeoffs === 'object'
        ? '<div class="tradeoff-grid">' +
            '<div class="trade-card pro"><h4>Pros</h4>' +
              U.md((t.tradeoffs.pros || []).map(function (x) { return '- ' + x; }).join('\n')) +
            '</div>' +
            '<div class="trade-card con"><h4>Cons</h4>' +
              U.md((t.tradeoffs.cons || []).map(function (x) { return '- ' + x; }).join('\n')) +
            '</div>' +
            (t.tradeoffs.when
              ? '<div class="trade-card" style="grid-column:1/-1"><h4>When to use</h4>' + U.md(t.tradeoffs.when) + '</div>'
              : '') +
          '</div>'
        : U.md(t.tradeoffs || '');
      return '<div class="section tradeoffs"><h2>5 \xB7 Trade-offs</h2>' + body + '</div>';
    }
  );

  /* 6 — Gotchas */
  def('gotchas', '6 \xB7 Gotchas',
    function (t) { return !!(t.gotchas && t.gotchas.length); },
    function (t, U) {
      var items = (t.gotchas || []).map(function (g) {
        return '<div class="gotcha-item">⚠️ ' + U.esc(g) + '</div>';
      }).join('');
      return '<div class="section gotchas"><h2>6 \xB7 Gotchas</h2>' + items + '</div>';
    }
  );

  /* ── Template Registry ─────────────────────────────────────────
   * Each area → ordered array of slot ids.
   * Slots whose condition() = false are skipped automatically.
   ──────────────────────────────────────────────────────────────── */
  var AREA_TEMPLATES = {
    sysdesign:     ['workbench', 'flow', 'uml', 'arch', 'viz', 'concept', 'why', 'code', 'interview', 'tradeoffs', 'gotchas'],
    dsa:           ['viz', 'concept', 'why', 'code', 'interview', 'tradeoffs'],
    java:          ['flow', 'uml', 'arch', 'viz', 'concept', 'why', 'code', 'interview', 'tradeoffs', 'gotchas'],
    golang:        ['flow', 'uml', 'arch', 'viz', 'concept', 'why', 'code', 'interview', 'tradeoffs', 'gotchas'],
    python:        ['flow', 'uml', 'arch', 'viz', 'concept', 'why', 'code', 'interview', 'tradeoffs', 'gotchas'],
    rust:          ['flow', 'uml', 'arch', 'viz', 'concept', 'why', 'code', 'interview', 'tradeoffs', 'gotchas'],
    angular:       ['flow', 'uml', 'arch', 'viz', 'concept', 'why', 'code', 'interview', 'tradeoffs', 'gotchas'],
    react:         ['flow', 'uml', 'arch', 'viz', 'concept', 'why', 'code', 'interview', 'tradeoffs', 'gotchas'],
    kafka:         ['flow', 'uml', 'arch', 'viz', 'concept', 'why', 'code', 'interview', 'tradeoffs', 'gotchas'],
    microservices: ['workbench', 'flow', 'uml', 'arch', 'viz', 'concept', 'why', 'code', 'interview', 'tradeoffs', 'gotchas'],
    databases:     ['flow', 'uml', 'arch', 'viz', 'concept', 'why', 'code', 'interview', 'tradeoffs', 'gotchas'],
    _default:      ['flow', 'uml', 'arch', 'viz', 'concept', 'why', 'code', 'interview', 'tradeoffs', 'gotchas'],
  };

  /* ── Public API ──────────────────────────────────────────────── */

  /**
   * getSections(topic) → array of slot descriptors { id, heading }
   * Only returns slots whose condition passes for this topic.
   */
  function getSections(topic) {
    var template = AREA_TEMPLATES[topic.area] || AREA_TEMPLATES._default;
    return template
      .map(function (id) { return SLOTS[id]; })
      .filter(function (slot) { return slot && slot.condition(topic); });
  }

  /**
   * buildHTML(topic, utils) → full inner HTML string for the topic body
   * utils = { esc, md, codeBlock }
   */
  function buildHTML(topic, utils) {
    var template = AREA_TEMPLATES[topic.area] || AREA_TEMPLATES._default;
    return template.map(function (id) {
      var slot = SLOTS[id];
      if (!slot || !slot.condition(topic)) return '';
      try { return slot.html(topic, utils); }
      catch (e) {
        console.error('[TopicTemplates] slot "' + id + '" error:', e);
        return '';
      }
    }).join('');
  }

  window.TopicTemplates = {
    SLOTS: SLOTS,
    AREA_TEMPLATES: AREA_TEMPLATES,
    getSections: getSections,
    buildHTML: buildHTML,
  };
})();
