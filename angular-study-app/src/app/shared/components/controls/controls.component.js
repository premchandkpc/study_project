/**
 * controls.component.js — reusable play/pause/step/reset control bar
 * Angular equiv: @Component({ selector: 'app-controls' }) with @Input()/@Output()
 * Exposes: window.App.ControlsComponent(host, opts) → controller
 *
 * In Angular:
 *   @Input() steps: Step[]
 *   @Output() stepChange = new EventEmitter<number>()
 *   @Output() stateChange = new EventEmitter<'playing'|'paused'|'idle'>()
 */
(function () {
  'use strict';
  window.App = window.App || {};

  const { Animation } = window.App.Constants;

  /**
   * @param {HTMLElement} host — mount point
   * @param {object}      opts
   * @param {number}      opts.total    — total step count
   * @param {number}      [opts.interval] — ms per auto-step (default FLOW_STEP)
   * @param {function}    opts.onStep   — called with nextIndex when step changes
   * @param {function}    [opts.onStateChange] — called with 'playing'|'paused'|'idle'
   * @returns controller { setProgress, setIndex, destroy }
   */
  window.App.ControlsComponent = function ControlsComponent(host, opts) {
    const interval = opts.interval || Animation.FLOW_STEP;
    let index   = 0;
    let total   = opts.total || 1;
    let timer   = null;
    let playing = false;

    host.innerHTML = `
      <div class="ctrl-bar">
        <button class="ctrl-btn" data-ctrl-prev title="Previous step">‹ Prev</button>
        <button class="ctrl-btn ctrl-play" data-ctrl-play title="Play / Pause">▶ Play</button>
        <button class="ctrl-btn" data-ctrl-next title="Next step">Next ›</button>
        <button class="ctrl-btn ctrl-reset" data-ctrl-reset title="Reset">↺</button>
        <div class="ctrl-progress" aria-label="Progress">
          <div class="ctrl-progress-fill" data-ctrl-fill style="width:0%"></div>
        </div>
        <span class="ctrl-counter" data-ctrl-counter>1 / ${total}</span>
      </div>
    `;

    const fillEl    = host.querySelector('[data-ctrl-fill]');
    const counterEl = host.querySelector('[data-ctrl-counter]');
    const playBtn   = host.querySelector('[data-ctrl-play]');

    function updateUI() {
      const pct = total > 1 ? ((index + 1) / total) * 100 : 100;
      fillEl.style.width = pct + '%';
      counterEl.textContent = (index + 1) + ' / ' + total;
      playBtn.textContent = playing ? '⏸ Pause' : '▶ Play';
    }

    function stop() {
      playing = false;
      clearInterval(timer);
      timer = null;
      updateUI();
      opts.onStateChange && opts.onStateChange('paused');
    }

    function goTo(nextIndex) {
      index = ((nextIndex % total) + total) % total;
      opts.onStep(index);
      updateUI();
      if (index === total - 1 && playing) stop();
    }

    function play() {
      playing = true;
      updateUI();
      opts.onStateChange && opts.onStateChange('playing');
      timer = setInterval(() => goTo(index + 1), interval);
    }

    host.querySelector('[data-ctrl-prev]').addEventListener('click',  () => { stop(); goTo(index - 1); });
    host.querySelector('[data-ctrl-next]').addEventListener('click',  () => { stop(); goTo(index + 1); });
    host.querySelector('[data-ctrl-reset]').addEventListener('click', () => { stop(); goTo(0); });
    playBtn.addEventListener('click', () => playing ? stop() : play());

    goTo(0);

    return {
      setTotal(n)  { total = n; updateUI(); },
      setIndex(i)  { goTo(i); },
      setProgress(pct) { fillEl.style.width = pct + '%'; },
      destroy()    { stop(); },
    };
  };
})();
