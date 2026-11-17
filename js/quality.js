/** Adaptive pixel density for low-power devices. Does not alter scene geometry. */
export class AdaptiveQuality {
  constructor(renderer) {
    this.renderer = renderer;
    this.nativeDpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.isMobile = window.matchMedia('(pointer: coarse)').matches;
    this.pixelRatio = Math.min(this.nativeDpr, this.isMobile ? 1.2 : 1.5);
    this.minDpr = Math.min(this.pixelRatio, this.isMobile ? .8 : 1);
    this.preset = this.isMobile ? 'mobile' : 'desktop';
    this.flagFrameInterval = this.isMobile ? 1000 / 24 : 1000 / 30;
    this.slowWindows = 0;
    this.goodWindows = 0;
    this.framesObserved = 0;
    this.lastChange = 0;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    renderer.setPixelRatio(this.pixelRatio);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(width, height, false);
  }

  observe(sample) {
    // Only tune from sustained animation samples, not long gaps in demand rendering.
    if (!sample || !sample.continuous || !Number.isFinite(sample.fps)) return;
    if (sample.fps < (this.isMobile ? 20 : 25)) {
      this.slowWindows++;
      this.goodWindows = 0;
    } else if (sample.fps >= (this.isMobile ? 23 : 28)) {
      this.goodWindows++;
      this.slowWindows = 0;
    }
    const now = performance.now();
    if (now - this.lastChange < 8000) return;
    if (this.slowWindows >= 3 && this.pixelRatio > this.minDpr + .04) {
      this.setDpr(Math.max(this.minDpr, this.pixelRatio - .15));
    } else if (this.goodWindows >= 7 && this.pixelRatio < this.nativeDpr - .04) {
      this.setDpr(Math.min(this.nativeDpr, this.pixelRatio + .10));
    }
  }

  setDpr(next) {
    this.pixelRatio = Math.round(next * 100) / 100;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.lastChange = performance.now();
    this.slowWindows = 0;
    this.goodWindows = 0;
  }
}
