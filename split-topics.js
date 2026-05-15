#!/usr/bin/env node
/**
 * split-topics.js
 * Reads each monolithic topic JS file and splits it into one-file-per-topic
 * under src/modules/topics/<area>/<id>.js
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, 'angular-study-app/src/modules/topics');
const INDEX_HTML = path.join(__dirname, 'angular-study-app/index.html');

// ── helpers ────────────────────────────────────────────────────────────────

/**
 * Extract top-level object literals from a JS array literal string.
 * Handles template literals, single/double quoted strings, escaped chars.
 * @param {string} src - the full source of the array, including the surrounding [ ]
 * @returns {string[]} array of raw object literal strings
 */
function extractObjects(src) {
  // Find the first '[' and last ']'
  const startBracket = src.indexOf('[');
  const endBracket = src.lastIndexOf(']');
  if (startBracket === -1 || endBracket === -1) return [];

  const inner = src.slice(startBracket + 1, endBracket);

  const objects = [];
  let depth = 0;
  let inString = false;
  let stringChar = null;
  let objectStart = -1;
  let i = 0;

  while (i < inner.length) {
    const ch = inner[i];

    // ── string / template-literal handling ───────────────────────────────
    if (inString) {
      if (ch === '\\') {
        i += 2; // skip escaped char
        continue;
      }
      if (stringChar === '`') {
        // template literal — handle nested ${...}
        if (ch === '`') {
          inString = false;
          stringChar = null;
        }
        // We don't need to handle nested ${} for brace-counting accuracy
        // because we only count { } when NOT inString
      } else {
        if (ch === stringChar) {
          inString = false;
          stringChar = null;
        }
      }
      i++;
      continue;
    }

    // Check for string open
    if (ch === '`' || ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      i++;
      continue;
    }

    // Brace counting (only outside strings)
    if (ch === '{') {
      if (depth === 0) {
        objectStart = i;
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objectStart !== -1) {
        objects.push(inner.slice(objectStart, i + 1));
        objectStart = -1;
      }
    }

    i++;
  }

  return objects;
}

/**
 * Get all array literal source strings from a file.
 * For sysdesign.js, there are multiple part arrays.
 */
function getArraySources(fileSrc) {
  const arrays = [];

  // Pattern: window.FOO = [ ... ];
  // or: var partN = [ ... ];
  // We need to find each [...] that is assigned to a topics variable.
  // Strategy: find all positions of '= [' or '= (' and extract the bracketed content.

  // Find all top-level array start positions:
  // matches like: window.SYSDESIGN_TOPICS = [  or  var part2 = [
  const arrayStartRe = /(?:window\.\w+|var\s+part\d+)\s*=\s*\[/g;
  let match;

  while ((match = arrayStartRe.exec(fileSrc)) !== null) {
    // Find the '[' position
    const bracketPos = fileSrc.indexOf('[', match.index + match[0].length - 1);
    if (bracketPos === -1) continue;

    // Now scan to find matching ']' (accounting for nesting, strings, templates)
    let depth = 0;
    let inStr = false;
    let strCh = null;
    let end = -1;

    for (let i = bracketPos; i < fileSrc.length; i++) {
      const c = fileSrc[i];

      if (inStr) {
        if (c === '\\') { i++; continue; }
        if (strCh === '`') {
          if (c === '`') { inStr = false; strCh = null; }
        } else {
          if (c === strCh) { inStr = false; strCh = null; }
        }
        continue;
      }

      if (c === '`' || c === '"' || c === "'") { inStr = true; strCh = c; continue; }
      if (c === '[') depth++;
      else if (c === ']') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }

    if (end !== -1) {
      arrays.push(fileSrc.slice(bracketPos, end + 1));
    }
  }

  return arrays;
}

/**
 * Get topic id from raw object text.
 */
function getTopicId(objText) {
  const m = objText.match(/\bid\s*:\s*["'`]([^"'`]+)["'`]/);
  return m ? m[1] : null;
}

/**
 * Get topic area from raw object text.
 */
function getTopicArea(objText) {
  const m = objText.match(/\barea\s*:\s*["'`]([^"'`]+)["'`]/);
  return m ? m[1] : null;
}

/**
 * Build global var name from area.
 */
function globalVar(area) {
  const map = {
    java: 'JAVA_TOPICS',
    golang: 'GO_TOPICS',
    python: 'PYTHON_TOPICS',
    microservices: 'MICRO_TOPICS',
    sysdesign: 'SYSDESIGN_TOPICS',
    agents: 'AGENT_TOPICS',
    dsa: 'DSA_TOPICS',
  };
  return map[area] || (area.toUpperCase() + '_TOPICS');
}

/**
 * Wrap a raw object text in the self-registering IIFE.
 */
function wrapTopic(objText, area) {
  const gvar = globalVar(area);
  return `(function() {
  var topic = ${objText};
  window.${gvar} = (window.${gvar} || []).concat([topic]);
})();
`;
}

// ── per-file config ────────────────────────────────────────────────────────

const FILES = [
  { file: 'java.js',         area: 'java' },
  { file: 'golang.js',       area: 'golang' },
  { file: 'python.js',       area: 'python' },
  { file: 'microservices.js',area: 'microservices' },
  { file: 'sysdesign.js',    area: 'sysdesign' },
  { file: 'agents.js',       area: 'agents' },
  { file: 'dsa.js',          area: 'dsa' },
];

// ── main ───────────────────────────────────────────────────────────────────

const allGeneratedPaths = []; // relative to angular-study-app for index.html
const summary = {};

for (const { file, area } of FILES) {
  const srcPath = path.join(BASE, file);
  const src = fs.readFileSync(srcPath, 'utf8');

  const arraySrcs = getArraySources(src);
  if (arraySrcs.length === 0) {
    console.error(`WARNING: no arrays found in ${file}`);
    continue;
  }

  // Collect all topic objects across all arrays in this file
  const allObjects = [];
  for (const arraySrc of arraySrcs) {
    const objs = extractObjects(arraySrc);
    allObjects.push(...objs);
  }

  // Create output folder
  const outDir = path.join(BASE, area);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const writtenIds = [];

  for (const objText of allObjects) {
    let id = getTopicId(objText);
    const objArea = getTopicArea(objText) || area;

    if (!id) {
      console.error(`WARNING: no id found in object in ${file}, skipping.`);
      continue;
    }

    // Sanitize id for filename
    const filename = id.replace(/[^a-zA-Z0-9_\-]/g, '_') + '.js';
    const outPath = path.join(outDir, filename);

    fs.writeFileSync(outPath, wrapTopic(objText, objArea));
    writtenIds.push(id);
    allGeneratedPaths.push(`src/modules/topics/${area}/${filename}`);
  }

  summary[area] = writtenIds.length;
  console.log(`✓ ${area}: wrote ${writtenIds.length} topics → src/modules/topics/${area}/`);
  writtenIds.forEach(id => console.log(`    ${id}`));
}

// ── Update index.html ──────────────────────────────────────────────────────

const htmlSrc = fs.readFileSync(INDEX_HTML, 'utf8');

// Build new script tags
const newScriptTags = allGeneratedPaths
  .map(p => `    <script src="${p}"></script>`)
  .join('\n');

// Find the old block and replace
const oldTagsRe = /(\s*<script src="src\/modules\/topics\/java\.js"><\/script>[\s\S]*?<script src="src\/modules\/topics\/dsa\.js"><\/script>)/;

if (oldTagsRe.test(htmlSrc)) {
  const newHtml = htmlSrc.replace(
    oldTagsRe,
    `\n    <!-- ── individual topic files (auto-generated by split-topics.js) ── -->\n${newScriptTags}`
  );
  fs.writeFileSync(INDEX_HTML, newHtml);
  console.log('\n✓ index.html updated with individual topic script tags.');
} else {
  console.error('\nWARNING: Could not find old script tags pattern in index.html. Manual update needed.');
  console.log('\nNew script tags to add:\n');
  console.log(newScriptTags);
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log('\n══ Summary ══');
let total = 0;
for (const [area, count] of Object.entries(summary)) {
  console.log(`  ${area}: ${count} files`);
  total += count;
}
console.log(`  TOTAL: ${total} topic files generated`);
