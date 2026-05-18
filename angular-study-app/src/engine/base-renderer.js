/**
 * base-renderer.js — Hierarchical OOP renderer chain
 *
 * Class hierarchy:
 *
 *   BaseRenderer          (abstract root — defines the render() interface contract)
 *   └── CanvasRenderer    (parent for all canvas-based renderers)
 *       ├── FlowRenderer
 *       ├── SwimlaneRenderer
 *       └── LayeredRenderer
 *
 * All concrete renderers MUST extend CanvasRenderer and implement render(mount, cfg).
 * Shared utilities live here — no duplication across subclasses.
 */
(function () {
  "use strict";

  // ── BaseRenderer ─────────────────────────────────────────────────────────
  // Abstract root. Defines the interface every renderer must satisfy.
  function BaseRenderer() {}

  // Abstract — must be overridden by each concrete renderer
  BaseRenderer.prototype.render = function () {
    throw new Error("[BaseRenderer] render() is abstract — " +
      (this.constructor && this.constructor.name ? this.constructor.name : "subclass") +
      " must override it");
  };

  // Shared error display — all subclasses call this._error(mount, msg)
  BaseRenderer.prototype._error = function (mount, msg) {
    if (!mount) return;
    mount.innerHTML = "<div style=\"color:#f85149;padding:16px;" +
      "font-family:monospace;font-size:12px;border-radius:8px;" +
      "background:#1a0a0a;border:1px solid #f8514933\">Renderer error: " + msg + "</div>";
  };

  // ── CanvasRenderer ────────────────────────────────────────────────────────
  // Parent for all canvas-based renderers.
  // Provides: CVU access guard, canvas creation, RAF utilities,
  //           play/pause button factory, and step button factory.
  function CanvasRenderer() {
    BaseRenderer.call(this);
  }
  CanvasRenderer.prototype = Object.create(BaseRenderer.prototype);
  CanvasRenderer.prototype.constructor = CanvasRenderer;

  // Guard: returns CVU or displays an error and returns null
  CanvasRenderer.prototype._cvu = function (mount) {
    if (window.CVU) return window.CVU;
    if (mount) this._error(mount, "canvas-utils.js must load before renderers");
    return null;
  };

  // Create a DPR-aware canvas in the mount via CVU.makeCanvas
  // Returns the <canvas> element, or null on failure
  CanvasRenderer.prototype._makeCanvas = function (mount, W, H) {
    var U = this._cvu(mount);
    if (!U) return null;
    return U.makeCanvas(mount, W, H);
  };

  // Create a horizontal control row via CVU.makeCtrlRow
  CanvasRenderer.prototype._makeCtrlRow = function (mount) {
    var U = this._cvu(mount);
    if (!U) return null;
    return U.makeCtrlRow(mount);
  };

  // Create a status/label element via CVU.makeStatus
  CanvasRenderer.prototype._makeStatus = function (mount) {
    var U = this._cvu(mount);
    if (!U) return null;
    return U.makeStatus(mount);
  };

  // Create a styled button via CVU.makeBtn
  CanvasRenderer.prototype._makeBtn = function (label, color) {
    var U = window.CVU;
    if (!U) return document.createElement("button");
    return U.makeBtn(label, color);
  };

  // Cancel a RAF id safely; always returns null for easy assignment:
  //   rafId = this._cancelRaf(rafId);
  CanvasRenderer.prototype._cancelRaf = function (rafId) {
    if (rafId) cancelAnimationFrame(rafId);
    return null;
  };

  // Guard for RAF ticks — returns false if the canvas is no longer in DOM
  CanvasRenderer.prototype._alive = function (canvas) {
    return !!canvas && document.body.contains(canvas);
  };

  // Build a play/pause controller attached to an existing button element.
  // Returns a controller object: { isRunning(), setPlaying(bool), toggle() }
  // Calls onPlay() when entering play state, onStop() when pausing.
  CanvasRenderer.prototype._playCtrl = function (btn, onPlay, onStop) {
    var playing = false;
    var ctrl = {
      isRunning: function ()     { return playing; },
      setPlaying: function (v) {
        playing = !!v;
        btn.textContent = playing ? "⏸ Pause" : "▶ Play";
      },
      toggle: function () {
        playing = !playing;
        btn.textContent = playing ? "⏸ Pause" : "▶ Play";
        if (playing) { if (onPlay)  onPlay();  }
        else         { if (onStop)  onStop();  }
      },
    };
    btn.addEventListener("click", function () { ctrl.toggle(); });
    return ctrl;
  };

  // ── Exports ───────────────────────────────────────────────────────────────
  window.BaseRenderer   = BaseRenderer;
  window.CanvasRenderer = CanvasRenderer;
})();
