
class OndaPlayer extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: "open" });

    this.frameCount = 253;
    this.requestedFrame = 0;
    this.displayedFrame = -1;
    this.images = new Array(this.frameCount);
    this.loading = new Set();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          background: #0b2427;
          overflow: hidden;
        }

        canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
      </style>

      <canvas></canvas>
    `;

    this.canvas = this.shadowRoot.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
  }

  connectedCallback() {
    this.resizeObserver.observe(this);
    this.resize();

    // 優先載入第一格
    this.loadFrame(0);

    // 背景預載其餘圖片
    let next = 1;

    const preload = () => {
      if (!this.isConnected) return;

      const end = Math.min(next + 8, this.frameCount);

      for (let i = next; i < end; i++) {
        this.loadFrame(i);
      }

      next = end;

      if (next < this.frameCount) {
        this.preloadTimer = setTimeout(preload, 80);
      }
    };

    this.preloadTimer = setTimeout(preload, 200);
  }

  disconnectedCallback() {
    this.resizeObserver.disconnect();
    clearTimeout(this.preloadTimer);
  }

  frameURL(index) {
    return (
      "https://pl0003777.github.io/onda-pro-scroll/frames/frame_" +
      String(index + 1).padStart(4, "0") +
      ".webp"
    );
  }

  resize() {
    const rect = this.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (!rect.width || !rect.height) return;

    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);

    if (this.displayedFrame >= 0) {
      this.drawFrame(this.displayedFrame);
    }
  }

  drawFrame(index) {
    const img = this.images[index];

    if (!img || !img.complete || !img.naturalWidth) {
      return;
    }

    const cw = this.canvas.width;
    const ch = this.canvas.height;

    const scale = Math.max(
      cw / img.naturalWidth,
      ch / img.naturalHeight
    );

    const width = img.naturalWidth * scale;
    const height = img.naturalHeight * scale;

    const x = (cw - width) / 2;
    const y = (ch - height) / 2;

    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, x, y, width, height);

    this.displayedFrame = index;
  }

  loadFrame(index) {
    if (index < 0 || index >= this.frameCount) return;
    if (this.images[index] || this.loading.has(index)) return;

    this.loading.add(index);

    const img = new Image();

    img.onload = () => {
      this.loading.delete(index);
      this.images[index] = img;

      if (index === this.requestedFrame) {
        this.drawFrame(index);
      }
    };

    img.onerror = () => {
      this.loading.delete(index);
      console.error("ONDA 圖片載入失敗：", this.frameURL(index));
    };

    img.src = this.frameURL(index);
  }

  setProgress(value) {
    const progress = Number(value);

    if (!Number.isFinite(progress)) return;

    const clamped = Math.max(0, Math.min(1, progress));

    this.requestedFrame = Math.round(
      clamped * (this.frameCount - 1)
    );

    if (this.images[this.requestedFrame]) {
      this.drawFrame(this.requestedFrame);
    } else {
      this.loadFrame(this.requestedFrame);
    }

    for (let offset = -5; offset <= 5; offset++) {
      this.loadFrame(this.requestedFrame + offset);
    }
  }

  // 讓 Wix Velo 可以透過屬性控制播放進度
  static get observedAttributes() {
    return ["progress"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "progress" && oldValue !== newValue) {
      this.setProgress(newValue);
    }
  }
}

if (!customElements.get("onda-player")) {
  customElements.define("onda-player", OndaPlayer);
}
