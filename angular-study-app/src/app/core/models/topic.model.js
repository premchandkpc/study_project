/**
 * topic.model.js — topic data shape + factory
 * Angular equiv: topic.model.ts (interface + class)
 * Exposes: window.App.Models.Topic
 *
 * In Angular this would be:
 *   export interface Topic { id: string; title: string; area: AreaKey; ... }
 */
(function () {
  'use strict';
  window.App = window.App || {};
  window.App.Models = window.App.Models || {};

  // Shape descriptor — documents every valid field on a topic object
  window.App.Models.TopicShape = Object.freeze({
    id:           'string   — unique slug, used as URL path e.g. java-jvm-memory-gc',
    title:        'string   — display title',
    area:         'string   — one of: java|golang|python|microservices|sysdesign|dsa|kafka|rust|angular|react|databases',
    tag:          'string?  — short label badge e.g. "Core", "Advanced"',
    tags:         'string[] — searchable keywords',
    concept:      'string?  — markdown: what it is',
    why:          'string?  — markdown: why it matters in production',
    example:      '{ language, code, notes }?',
    interview:    '{ question, answer, followUps[] }[]?',
    tradeoffs:    '{ pros[], cons[], when? } | string?',
    gotchas:      'string[]?',
    flow:         '{ title, caption, nodes[], steps[] }?   — flow lab',
    uml:          '{ title, scenario, actors[], messages[] }? — UML lab',
    architecture: '{ title, caption, lanes[], links[] }?   — arch lab',
    visual:       'function(mountEl)?                      — canvas visualizer',
  });

  // Factory — creates a validated topic object with defaults
  window.App.Models.createTopic = function createTopic(fields) {
    if (!fields.id)    throw new Error('Topic requires id');
    if (!fields.title) throw new Error('Topic requires title');
    if (!fields.area)  throw new Error('Topic requires area');

    return Object.assign({
      tag:          null,
      tags:         [],
      concept:      '',
      why:          '',
      example:      null,
      interview:    [],
      tradeoffs:    null,
      gotchas:      [],
      flow:         null,
      uml:          null,
      architecture: null,
      visual:       null,
    }, fields);
  };

  // Type guard — checks if object looks like a Topic
  window.App.Models.isTopic = function isTopic(obj) {
    return obj && typeof obj.id === 'string' && typeof obj.title === 'string' && typeof obj.area === 'string';
  };
})();
