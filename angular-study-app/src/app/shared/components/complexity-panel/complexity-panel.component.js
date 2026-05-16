/**
 * complexity-panel.component.js — Big-O complexity badge display
 * Angular equiv: @Component({ selector: 'app-complexity-panel' })
 * Exposes: window.App.ComplexityPanelComponent(host) → { show(time, space, notes?) }
 *
 * In Angular:
 *   @Input() time: ComplexityToken
 *   @Input() space: ComplexityToken
 *   @Input() notes?: string
 */
(function () {
  'use strict';
  window.App = window.App || {};

  const C = window.App.Constants.Complexity;

  /**
   * @param {HTMLElement} host
   * @returns {{ show(timeLabel, spaceLabel, notes?): void }}
   */
  window.App.ComplexityPanelComponent = function ComplexityPanelComponent(host) {
    host.innerHTML = `
      <div class="complexity-panel">
        <div class="cpx-row">
          <span class="cpx-label">Time</span>
          <span class="cpx-badge" data-cpx-time>—</span>
          <span class="cpx-name"  data-cpx-time-name></span>
        </div>
        <div class="cpx-row">
          <span class="cpx-label">Space</span>
          <span class="cpx-badge" data-cpx-space>—</span>
          <span class="cpx-name"  data-cpx-space-name></span>
        </div>
        <div class="cpx-notes" data-cpx-notes style="display:none"></div>
      </div>
    `;

    const timeBadge  = host.querySelector('[data-cpx-time]');
    const timeName   = host.querySelector('[data-cpx-time-name]');
    const spaceBadge = host.querySelector('[data-cpx-space]');
    const spaceName  = host.querySelector('[data-cpx-space-name]');
    const notesEl    = host.querySelector('[data-cpx-notes]');

    function renderBadge(badgeEl, nameEl, label) {
      const token = C.fromLabel ? C.fromLabel(label) : null;
      badgeEl.textContent = label || '—';
      badgeEl.style.color = token ? token.color : '#8b949e';
      badgeEl.style.borderColor = token ? token.color + '44' : '#30363d';
      nameEl.textContent  = token ? token.name : '';
    }

    // Mirrors Angular @Input() setter — updates DOM when data changes
    function show(timeLabel, spaceLabel, notes) {
      renderBadge(timeBadge, timeName, timeLabel);
      renderBadge(spaceBadge, spaceName, spaceLabel);
      if (notes) {
        notesEl.textContent    = notes;
        notesEl.style.display  = '';
      } else {
        notesEl.style.display  = 'none';
      }
    }

    return { show };
  };
})();
