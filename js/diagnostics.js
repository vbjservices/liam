/** Optional performance HUD: append ?debug=1 to the URL. */
export class FrameDiagnostics {
  constructor(renderer) {
    this.renderer = renderer;
    this.enabled = new URLSearchParams(window.location.search).get('debug') === '1';
    this.prev = 0;
    this.samples = [];
    this.lastReport = 0;
    this.hud = null;
    if (this.enabled) {
      this.hud = document.createElement('output');
      this.hud.setAttribute('aria-label', 'Performance diagnostics');
      Object.assign(this.hud.style, {
        position:'fixed', right:'12px', top:'88px', zIndex:'110',
        font:'12px/1.6 monospace', color:'#dff7e9', background:'#0b1829e8',
        padding:'12px 14px', pointerEvents:'none', whiteSpace:'pre-line',
        border:'1px solid #8fb1b577', borderRadius:'8px',
      });
      document.body.append(this.hud);
    }
  }

  sample(now, dpr, preset) {
    const delta = this.prev ? now - this.prev : 0;
    this.prev = now;
    // Exclude >150 ms idle periods to avoid treating on-demand rendering as low FPS.
    const continuous = delta > 6 && delta < 150;
    if (continuous) {
      this.samples.push(delta);
      if (this.samples.length > 45) this.samples.shift();
    } else this.samples.length = 0;
    if (this.samples.length < 20 || now - this.lastReport < 1300) return null;
    this.lastReport = now;
    const mean = this.samples.reduce((a,b)=>a+b,0) / this.samples.length;
    const fps = 1000 / mean;
    if (this.hud) {
      const info = this.renderer.info;
      this.hud.textContent = `FPS (sample): ${fps.toFixed(0)}\nFrame: ${mean.toFixed(1)} ms\nDPR: ${dpr.toFixed(2)} / ${preset}\nDraw calls: ${info.render.calls}\nTriangles: ${info.render.triangles.toLocaleString()}\nTextures: ${info.memory.textures}\nGeometries: ${info.memory.geometries}`;
    }
    return { fps, continuous:true };
  }
}
