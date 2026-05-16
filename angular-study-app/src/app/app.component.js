/**
 * app.component.js — root bootstrap, composes shell layout
 * Exposes: nothing (auto-bootstraps on DOMContentLoaded)
 * Load after: all services + components
 */
(function () {
  'use strict';

  function bootstrap() {
    const { Router, SidebarComponent, TopicDetailComponent } = window.App;

    const root = document.querySelector('app-root');
    root.classList.add('app-shell', 'home-mode');
    root.innerHTML = `
      <header class="app-header" id="app-header">
        <button class="hdr-back" id="hdr-back">← Study Lab</button>
        <span class="hdr-div">|</span>
        <span class="hdr-area-dot" id="hdr-dot"></span>
        <span class="hdr-area" id="hdr-area"></span>
        <span class="hdr-sep" id="hdr-sep" style="display:none">›</span>
        <span class="hdr-topic" id="hdr-topic"></span>
        <span style="flex:1"></span>
        <button class="hdr-coder-btn" id="hdr-coder-btn">⚡ Code Runner</button>
      </header>
      <aside class="sidebar"></aside>
      <main class="main"></main>
    `;

    Router.current.subscribe(({ path }) => {
      const isHome = path === '/' || path === '';
      const isCoder = path === '/coder';
      root.classList.toggle('home-mode', isHome);
      if (!isCoder) root.classList.remove('coder-mode');
    });

    root.querySelector('#hdr-back').addEventListener('click', () => Router.navigate('/'));
    root.querySelector('#hdr-coder-btn').addEventListener('click', () => Router.navigate('/coder'));

    SidebarComponent(root.querySelector('.sidebar'));
    TopicDetailComponent(root.querySelector('.main'));

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        const homeSearch = document.querySelector('#home-search-input');
        const sideSearch = root.querySelector('#sidebar-search');
        if (homeSearch) { e.preventDefault(); homeSearch.focus(); homeSearch.select(); }
        else if (sideSearch) { e.preventDefault(); sideSearch.focus(); sideSearch.select(); }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
