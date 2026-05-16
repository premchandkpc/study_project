/**
 * app.selectors.js — derived state projections
 * Angular equiv: NgRx createSelector() — memoized derived state
 * Exposes: window.App.Store.Selectors
 *
 * In Angular/NgRx:
 *   export const selectProgress = createSelector(selectApp, s => s.progress);
 *   export const selectIsDone = (id) => createSelector(selectProgress, p => p.has(id));
 */
(function () {
  'use strict';
  const { Store, TopicsService } = window.App;
  const { State } = Store;

  // Simple selector — reads from current state signal
  // Mirrors NgRx: store.select(selector)
  const Selectors = {
    // Progress selectors
    progress:     () => State().progress,
    isDone:       (id) => State().progress.has(id),
    doneCount:    () => State().progress.size,
    doneIds:      () => [...State().progress],

    // Ratio of done topics for an area
    areaRatio(areaKey) {
      const ids = TopicsService.byArea(areaKey).map(t => t.id);
      if (!ids.length) return 0;
      return ids.filter(id => State().progress.has(id)).length / ids.length;
    },

    // Router selectors
    currentPath:  () => State().router.path,
    currentQuery: () => State().router.query,

    // UI selectors
    searchQuery:  () => State().ui.searchQuery,
    sidebarOpen:  () => State().ui.sidebarOpen,
    isAreaOpen:   (key) => !State().ui.collapsedAreas[key],

    // Topic selectors
    selectedTopicId: () => State().selectedTopicId,
    selectedTopic:   () => TopicsService.byId(State().selectedTopicId),

    // Overall stats
    totalTopics:     () => TopicsService.all.length,
    totalDone:       () => State().progress.size,
    overallRatio:    () => {
      const total = TopicsService.all.length;
      return total ? State().progress.size / total : 0;
    },
  };

  Store.Selectors = Selectors;
})();
