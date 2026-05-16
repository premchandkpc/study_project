/**
 * main-layout.component.js — shell layout (header + sidebar + main router outlet)
 * Angular equiv: MainLayoutComponent with <router-outlet>
 * Exposes: window.App.MainLayoutComponent(root) → { headerEl, sidebarEl, mainEl }
 *
 * In Angular:
 *   @Component({ template: `
 *     <app-header></app-header>
 *     <app-sidebar></app-sidebar>
 *     <main><router-outlet></router-outlet></main>
 *   `})
 *   export class MainLayoutComponent {}
 */
(function () {
  'use strict';
  window.App = window.App || {};

  /**
   * Renders shell HTML into root element and wires header controls.
   * Called once from app.component.js bootstrap — mirrors Angular root layout.
   *
   * @param {HTMLElement} root — <app-root>
   * @returns {{ headerEl, sidebarEl, mainEl }}
   */
  window.App.MainLayoutComponent = function MainLayoutComponent(root) {
    const { Router } = window.App;

    root.classList.add('app-shell', 'home-mode');
    root.innerHTML = `
      <header class="app-header" id="app-header">
        <button class="hdr-back" id="hdr-back" aria-label="Go to home">← Study Lab</button>
        <span class="hdr-div" aria-hidden="true">|</span>
        <span class="hdr-area-dot" id="hdr-dot" aria-hidden="true"></span>
        <span class="hdr-area"     id="hdr-area"></span>
        <span class="hdr-sep"      id="hdr-sep" style="display:none" aria-hidden="true">›</span>
        <span class="hdr-topic"    id="hdr-topic"></span>
        <span style="flex:1" aria-hidden="true"></span>
        <button class="hdr-coder-btn" id="hdr-coder-btn" aria-label="Open Code Runner">⚡ Code Runner</button>
      </header>
      <aside class="sidebar" role="navigation" aria-label="Topic navigation"></aside>
      <main  class="main"    role="main"></main>
    `;

    const headerEl  = root.querySelector('.app-header');
    const sidebarEl = root.querySelector('.sidebar');
    const mainEl    = root.querySelector('.main');

    // Sync home-mode class with route (mirrors Angular Router + HostBinding)
    Router.current.subscribe(({ path }) => {
      const isHome  = path === '/' || path === '';
      const isCoder = path === '/coder';
      root.classList.toggle('home-mode', isHome);
      if (!isCoder) root.classList.remove('coder-mode');
    });

    root.querySelector('#hdr-back').addEventListener('click',
      () => Router.navigate('/')
    );
    root.querySelector('#hdr-coder-btn').addEventListener('click',
      () => Router.navigate('/coder')
    );

    return { headerEl, sidebarEl, mainEl };
  };
})();
