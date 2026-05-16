/**
 * narration-panel.component.js — step narration display with animated transitions
 * Angular equiv: @Component with @Input() text, @Input() label
 * Exposes: window.App.NarrationPanelComponent(host) → { update(label, text, type) }
 *
 * In Angular:
 *   @Input() label: string
 *   @Input() text: string
 *   @Input() type: 'info' | 'warn' | 'success' | 'code'
 */
(function () {
  'use strict';
  window.App = window.App || {};

  /**
   * @param {HTMLElement} host
   * @returns {{ update(label, text, type?): void }}
   */
  window.App.NarrationPanelComponent = function NarrationPanelComponent(host) {
    host.innerHTML = `
      <div class="narration-panel">
        <div class="narration-label" data-narr-label></div>
        <div class="narration-text"  data-narr-text></div>
      </div>
    `;

    const labelEl = host.querySelector('[data-narr-label]');
    const textEl  = host.querySelector('[data-narr-text]');

    // type: 'info' | 'warn' | 'success' | 'code'
    function update(label, text, type) {
      labelEl.textContent = label || '';
      textEl.textContent  = text  || '';

      // swap type class — mirrors Angular HostBinding('[class]')
      textEl.className = 'narration-text narration-' + (type || 'info');

      // CSS animation re-trigger trick (mirrors Angular animation trigger)
      textEl.style.animation = 'none';
      requestAnimationFrame(() => { textEl.style.animation = ''; });
    }

    return { update };
  };
})();
