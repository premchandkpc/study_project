/**
 * app.component.js — root bootstrap, composes shell layout
 * Exposes: nothing (auto-bootstraps on DOMContentLoaded)
 * Load after: all services + components
 */
(function () {
  'use strict';

  function bootstrap() {
    const { MainLayoutComponent, SidebarComponent, TopicDetailComponent } = window.App;

    const root = document.querySelector('app-root');

    // MainLayoutComponent renders shell HTML + wires header (mirrors Angular root layout)
    const { sidebarEl, mainEl } = MainLayoutComponent(root);

    // Mount feature components into layout slots (mirrors Angular router-outlet)
    SidebarComponent(sidebarEl);
    TopicDetailComponent(mainEl);

    // Ctrl+K — focus search (global keyboard shortcut)
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
