(function () {
  'use strict';

  /*
   * VizEngine — central dispatcher for all topic visualizations.
   *
   * Topics declare:
   *   visual: { type: 'flow'|'swimlane'|'layered'|'raw', ...config }
   *
   * topic-detail.component.js calls:
   *   VizEngine.render(mountEl, topic.visual)
   *
   * For legacy imperative topics still using function form,
   * topic-detail calls topic.visual(mount) directly (unchanged).
   */

  window.VizEngine = {
    _renderers: {},

    register: function (type, renderer) {
      this._renderers[type] = renderer;
    },

    render: function (mount, config) {
      if (!config) return;

      // Legacy function support
      if (typeof config === 'function') {
        try { config(mount); }
        catch (e) { this._err(mount, e.message); }
        return;
      }

      // Raw escape hatch — config.render is an imperative function
      if (config.type === 'raw') {
        if (typeof config.render === 'function') {
          try { config.render(mount); }
          catch (e) { this._err(mount, e.message); }
        }
        return;
      }

      var renderer = this._renderers[config.type];
      if (!renderer) {
        this._err(mount, 'VizEngine: no renderer for type "' + config.type + '"');
        return;
      }

      try { renderer.render(mount, config); }
      catch (e) { this._err(mount, e.message); }
    },

    _err: function (mount, msg) {
      mount.innerHTML = '<div style="color:#f85149;padding:16px;font-family:monospace;font-size:12px">' +
        'VizEngine error: ' + msg + '</div>';
    },
  };
})();
