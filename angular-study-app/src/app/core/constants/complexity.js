/**
 * complexity.js — Big-O complexity descriptors
 * Angular equiv: complexity.constants.ts
 * Exposes: window.App.Constants.Complexity
 */
(function () {
  "use strict";
  window.App = window.App || {};
  window.App.Constants = window.App.Constants || {};

  window.App.Constants.Complexity = Object.freeze({
    O1:        { label: "O(1)",       name: "Constant",       color: "#56d364", rank: 1 },
    OLOG_N:    { label: "O(log n)",   name: "Logarithmic",    color: "#79c0ff", rank: 2 },
    ON:        { label: "O(n)",       name: "Linear",         color: "#e3b341", rank: 3 },
    ON_LOG_N:  { label: "O(n log n)", name: "Linearithmic",  color: "#ffa657", rank: 4 },
    ON2:       { label: "O(n²)",      name: "Quadratic",      color: "#f85149", rank: 5 },
    ON3:       { label: "O(n³)",      name: "Cubic",          color: "#ff7b72", rank: 6 },
    O2N:       { label: "O(2ⁿ)",      name: "Exponential",    color: "#ff7b72", rank: 7 },
    ON_FACT:   { label: "O(n!)",      name: "Factorial",      color: "#ff7b72", rank: 8 },

    // Lookup by label string
    fromLabel(label) {
      return Object.values(this).find(v => v && v.label === label) || null;
    },
  });
})();
