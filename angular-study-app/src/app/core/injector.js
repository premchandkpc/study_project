/**
 * injector.js — Angular-style lightweight DI container
 * Exposes: window.App.Injector
 *
 * Usage:
 *   window.App.Injector.provide('MyService', () => new MyService());
 *   const svc = window.App.Injector.inject('MyService');
 */
(function () {
  'use strict';
  window.App = window.App || {};

  window.App.Injector = {
    _registry: new Map(),

    provide(token, factory) {
      const instance = factory();
      this._registry.set(token, instance);
      return instance;
    },

    inject(token) {
      if (!this._registry.has(token)) {
        throw new Error('[Injector] No provider for: ' + token);
      }
      return this._registry.get(token);
    },
  };
})();
