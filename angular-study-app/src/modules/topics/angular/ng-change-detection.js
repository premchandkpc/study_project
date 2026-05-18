(function () {
  "use strict";

  window.ANGULAR_TOPICS = (window.ANGULAR_TOPICS || []).concat([{
    id: "ng-change-detection",
    area: "angular",
    title: "Angular Change Detection",
    tag: "Performance",
    tags: ["angular", "change-detection", "zonejs", "onpush", "zone", "performance"],

    concept: `Angular's **Change Detection (CD)** is the mechanism that synchronizes component state with the DOM.

**Zone.js** monkey-patches all async APIs (setTimeout, Promises, XHR, Events). When any async task completes, Zone.js notifies Angular → CD cycle runs.

**Two CD Strategies:**

**Default (CheckAlways):** Every CD cycle checks EVERY component top-down, regardless of whether their inputs changed. Safe but expensive with large trees.

**OnPush:** Angular only checks a component when:
1. An @Input() reference changes (not deep equality)
2. An event originates inside the component
3. An Observable via \`async\` pipe emits
4. \`ChangeDetectorRef.markForCheck()\` called manually

**CD Cycle steps:**
1. Zone.js detects async event
2. Angular enters CD from root
3. Each component: check inputs → run template expression → update DOM
4. Repeat down the tree (Default) OR skip unchanged OnPush subtrees

**ChangeDetectorRef API:**
- \`markForCheck()\` — marks OnPush component as dirty (check it this cycle)
- \`detectChanges()\` — run CD for this component + children immediately
- \`detach()\` — remove from CD tree entirely (manual control)
- \`reattach()\` — add back to CD tree`,

    why: "OnPush is the #1 Angular performance optimization. With Default CD, a 200-component tree gets fully checked on every click. OnPush reduces that to only changed subtrees. Combined with immutable data and async pipe, it eliminates most unnecessary DOM checks.",

    example: {
      language: "typescript",
      code: `// Default CD — all components checked every cycle
@Component({ selector: 'app-user-list', template: '...' })
export class UserListComponent {
  @Input() users: User[];  // mutable array — CD checks every render
}

// OnPush — only checked when input reference changes
@Component({
  selector: 'app-user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <div>{{ user.name }}</div>
    <div>{{ lastLogin | async }}</div>
  \`,
})
export class UserCardComponent {
  @Input() user: User;  // only re-checks when new User object passed

  lastLogin$ = this.userSvc.getLastLogin(this.user.id);  // async pipe auto-marks

  constructor(
    private cdr: ChangeDetectorRef,
    private userSvc: UserService,
  ) {}

  // Manual trigger when needed
  refreshManually() {
    this.cdr.markForCheck();
  }
}

// WRONG — mutating existing object doesn't trigger OnPush
this.user.name = 'New Name';  // same reference → OnPush skips ❌

// CORRECT — new object reference triggers OnPush
this.user = { ...this.user, name: 'New Name' };  // new ref → OnPush checks ✅`,
    },

    interview: [
      "What is the difference between Default and OnPush change detection?",
      "How does Zone.js trigger Angular change detection?",
      "When would you use ChangeDetectorRef.detach()?",
      "Why does mutating an object not trigger OnPush re-render?",
      "How does the async pipe work with OnPush?",
      "What is the CD cycle order in Angular — top-down or bottom-up?",
    ],

    tradeoffs: {
      pros: [
        "OnPush massively reduces CD checks in large component trees",
        "Predictable: OnPush components only update on explicit triggers",
        "Works perfectly with immutable data patterns (NgRx, Immer)",
        "async pipe auto-handles subscription + markForCheck + unsubscribe",
      ],
      cons: [
        "OnPush requires immutable data — mutating objects breaks it silently",
        "Zone.js adds ~50KB bundle and patches ALL async APIs globally",
        "Requires discipline — easy to forget to emit new reference",
        "Debugging CD issues is non-obvious without Angular DevTools",
      ],
    },

    gotchas: [
      "Mutating input object (this.user.name = x) does NOT trigger OnPush — must create new reference",
      "setTimeout inside an OnPush component still triggers CD via Zone.js",
      "markForCheck() marks ancestors up to root — detectChanges() only goes down",
      "detach() stops ALL CD including children — reattach() to resume",
      "Angular 17+ signals bypass Zone.js entirely — no async task needed to trigger update",
    ],

    visual: function (mount) {
      var lanes = [
        {
          label: "Default CD\n(CheckAlways)",
          color: "#ffa657",
          bg: "rgba(255,166,87,0.07)",
          desc: "Every component checked top-to-bottom on every event. Safe but O(n) per cycle.",
          nodes: [
            { icon: "⚡", label: "Zone.js\nEvent" },
            { icon: "🌳", label: "Root\nComponent" },
            { icon: "🔵", label: "Child A", checked: true },
            { icon: "🔵", label: "Child B", checked: true },
            { icon: "🔵", label: "Child C", checked: true },
            { icon: "🖥️", label: "DOM\nUpdate" },
          ],
        },
        {
          label: "OnPush CD\n(Optimized)",
          color: "#3fb950",
          bg: "rgba(63,185,80,0.07)",
          desc: "Only dirty-marked components checked. Skip unchanged subtrees = massive perf win.",
          nodes: [
            { icon: "⚡", label: "Zone.js\nEvent" },
            { icon: "🌳", label: "Root\nComponent" },
            { icon: "✅", label: "Child A\n(dirty)", checked: true },
            { icon: "⏭️", label: "Child B\n(skipped)", skipped: true },
            { icon: "⏭️", label: "Child C\n(skipped)", skipped: true },
            { icon: "🖥️", label: "DOM\nUpdate" },
          ],
        },
        {
          label: "ChangeDetectorRef\nManual API",
          color: "#d2a8ff",
          bg: "rgba(210,168,255,0.07)",
          desc: "Escape hatch for full manual control: detach(), markForCheck(), detectChanges().",
          nodes: [
            { icon: "🔌", label: "detach()\nfrom tree" },
            { icon: "🛠️", label: "External\nUpdate" },
            { icon: "🎯", label: "markForCheck()\nor detectChanges()" },
            { icon: "🔁", label: "CD runs\nfor subtree" },
            { icon: "✅", label: "DOM\nSynced" },
          ],
        },
      ];

      mount.innerHTML = "<style>" +
        "#ngcd-wrap{font-family:\"JetBrains Mono\",monospace;padding:12px;background:#0d1117;border-radius:10px}" +
        "#ngcd-wrap h3{color:#e6edf3;font-size:12px;margin:0 0 10px;text-transform:uppercase;letter-spacing:1px;opacity:.6}" +
        ".ngcd-lane{display:flex;align-items:flex-start;margin-bottom:10px;border-radius:8px;padding:10px 12px;position:relative}" +
        ".ngcd-left-bar{position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:4px 0 0 4px}" +
        ".ngcd-label{min-width:100px;font-size:10px;font-weight:700;line-height:1.4;text-transform:uppercase;letter-spacing:.4px;white-space:pre-line;padding-right:10px;padding-top:4px}" +
        ".ngcd-flow{display:flex;align-items:center;flex:1;flex-wrap:wrap;gap:0}" +
        ".ngcd-node{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:54px;cursor:default;transition:transform .2s;padding:0 2px}" +
        ".ngcd-icon{font-size:18px;line-height:1}" +
        ".ngcd-node-label{font-size:8.5px;text-align:center;white-space:pre-line;line-height:1.2;max-width:58px}" +
        ".ngcd-node-skipped .ngcd-icon{opacity:.3}" +
        ".ngcd-node-skipped .ngcd-node-label{color:#484f58}" +
        ".ngcd-arrow{display:flex;align-items:center;min-width:20px;height:20px;position:relative;flex:0 0 20px}" +
        ".ngcd-arrow-line{flex:1;height:1.5px;opacity:.4}" +
        ".ngcd-dot{position:absolute;width:7px;height:7px;border-radius:50%;top:50%;transform:translateY(-50%);animation:ngcdDot 1.6s linear infinite}" +
        "@keyframes ngcdDot{0%{left:0;opacity:0}15%{opacity:1}85%{opacity:1}100%{left:calc(100% - 7px);opacity:0}}" +
        ".ngcd-desc{font-size:9px;color:#6e7681;margin-top:6px;padding-top:5px;border-top:1px solid rgba(255,255,255,.05);line-height:1.4}" +
        ".ngcd-checked-badge{font-size:7px;background:rgba(63,185,80,.2);color:#3fb950;border-radius:3px;padding:1px 3px;margin-top:1px}" +
        "</style>" +
        "<div id=\"ngcd-wrap\">" +
        "<h3>Angular Change Detection Strategies</h3>" +
        lanes.map(function (lane, li) {
          var nodesHtml = lane.nodes.map(function (n, i) {
            var isSkipped = n.skipped;
            var nodeClass = "ngcd-node" + (isSkipped ? " ngcd-node-skipped" : "");
            var labelColor = isSkipped ? "#484f58" : lane.color;
            var badge = n.checked ? "<div class=\"ngcd-checked-badge\">✓ checked</div>" : "";
            var nodeHtml = "<div class=\"" + nodeClass + "\" style=\"color:" + labelColor + "\">" +
              "<div class=\"ngcd-icon\">" + n.icon + "</div>" +
              "<div class=\"ngcd-node-label\" style=\"color:" + labelColor + "\">" + n.label + "</div>" +
              badge +
              "</div>";
            var arrowHtml = "";
            if (i < lane.nodes.length - 1) {
              var delay = (i * 0.28 + li * 0.5) + "s";
              arrowHtml = "<div class=\"ngcd-arrow\">" +
                "<div class=\"ngcd-arrow-line\" style=\"background:" + lane.color + "\"></div>" +
                (isSkipped ? "" : "<div class=\"ngcd-dot\" style=\"background:" + lane.color + ";animation-delay:" + delay + "\"></div>") +
                "</div>";
            }
            return nodeHtml + arrowHtml;
          }).join("");

          return "<div class=\"ngcd-lane\" style=\"background:" + lane.bg + "\">" +
            "<div class=\"ngcd-left-bar\" style=\"background:" + lane.color + "\"></div>" +
            "<div class=\"ngcd-label\" style=\"color:" + lane.color + "\">" + lane.label + "</div>" +
            "<div style=\"flex:1\">" +
              "<div class=\"ngcd-flow\">" + nodesHtml + "</div>" +
              "<div class=\"ngcd-desc\">" + lane.desc + "</div>" +
            "</div>" +
            "</div>";
        }).join("") +
        "</div>";
    },
  }]);
})();
