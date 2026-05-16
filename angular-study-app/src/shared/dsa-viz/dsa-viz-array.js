(function () {
  window.DSAViz ??= {};

  const THEME = {
    colors: {
      bg: "#0d1117",
      surface: "#161b22",
      border: "#30363d",
      text: "#c9d1d9",

      active: "#1f6feb",
      success: "#2ea043",
      error: "#da3633",
      warn: "#d29922",
      compare: "#f78166",
      swap: "#56d364",
    },

    animation: {
      fast: 150,
      normal: 300,
      slow: 700,
    }
  };

  class ArrayVisualizer {
    constructor(mount, config) {
      this.mount = mount;
      this.state = config;

      this.cellMap = new Map();

      this.init();
      this.render();
    }

    init() {
      this.mount.innerHTML = "";

      this.root = document.createElement("div");
      this.root.className = "dsa-array-root";

      this.wrapper = document.createElement("div");
      this.wrapper.className = "dsa-array-wrapper";

      this.root.appendChild(this.wrapper);
      this.mount.appendChild(this.root);

      this.injectStyles();
    }

    injectStyles() {
      if (document.getElementById("dsa-array-styles")) return;

      const style = document.createElement("style");
      style.id = "dsa-array-styles";

      style.textContent = `
        .dsa-array-root {
          background: ${THEME.colors.bg};
          border: 1px solid ${THEME.colors.border};
          border-radius: 16px;
          padding: 20px;
          overflow-x: auto;
          font-family: Inter, sans-serif;
        }

        .dsa-array-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          min-height: 160px;
        }

        .dsa-cell {
          position: relative;
          width: 60px;
          height: 60px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: ${THEME.colors.surface};
          border: 2px solid ${THEME.colors.border};

          border-radius: 14px;

          color: ${THEME.colors.text};
          font-weight: 700;

          transition:
            transform 300ms ease,
            background 300ms ease,
            border-color 300ms ease,
            box-shadow 300ms ease;

          will-change: transform;
        }

        .dsa-cell:hover {
          transform: translateY(-6px) scale(1.04);
        }

        .dsa-cell.active {
          border-color: ${THEME.colors.active};
          box-shadow: 0 0 18px rgba(31,111,235,0.4);
        }

        .dsa-cell.success {
          border-color: ${THEME.colors.success};
          box-shadow: 0 0 18px rgba(46,160,67,0.4);
        }

        .dsa-pointer {
          position: absolute;
          top: -30px;

          font-size: 12px;
          font-weight: bold;

          color: ${THEME.colors.warn};

          animation: bounce 1s infinite;
        }

        @keyframes bounce {
          0%,100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-6px);
          }
        }
      `;

      document.head.appendChild(style);
    }

    createCell(value, idx) {
      const cell = document.createElement("div");
      cell.className = "dsa-cell";

      cell.dataset.index = idx;

      cell.innerHTML = `
        <span>${value}</span>
      `;

      return cell;
    }

    applyState(cell, idx) {
      const highlight = this.state.highlights?.[idx];

      cell.className = "dsa-cell";

      if (highlight) {
        cell.classList.add(highlight);
      }

      const pointers = Object.entries(
        this.state.pointers || {}
      );

      pointers.forEach(([label, pos]) => {
        if (pos !== idx) return;

        const ptr = document.createElement("div");
        ptr.className = "dsa-pointer";
        ptr.innerText = label;

        cell.appendChild(ptr);
      });
    }

    render() {
      const arr = this.state.arr || [];

      arr.forEach((value, idx) => {
        let cell = this.cellMap.get(idx);

        if (!cell) {
          cell = this.createCell(value, idx);

          this.cellMap.set(idx, cell);

          this.wrapper.appendChild(cell);
        }

        cell.querySelector("span").innerText = value;

        this.applyState(cell, idx);
      });
    }

    update(nextState) {
      this.state = nextState;
      this.render();
    }

    animate(steps, delay = 800) {
      let i = 0;

      const next = () => {
        if (i >= steps.length) return;

        this.update(steps[i]);

        i++;

        requestAnimationFrame(() => {
          setTimeout(next, delay);
        });
      };

      next();
    }
  }

  window.DSAViz.array = {
    render(mount, config) {
      return new ArrayVisualizer(mount, config);
    }
  };
})();