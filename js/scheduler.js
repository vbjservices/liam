/** Render on demand during scroll; keep a capped loop for the summit flag only. */
export function createRenderScheduler(render, { shouldAnimate, getInterval }) {
  let pending = false;
  let nextId = 0;
  let lastDraw = 0;
  let invalidated = false;

  function tick(now) {
    pending = false;
    nextId = 0;
    if (document.hidden) return;
    const active = shouldAnimate();
    const interval = active ? getInterval() : 0;
    if (active && !invalidated && now - lastDraw < interval) {
      queue();
      return;
    }
    invalidated = false;
    lastDraw = now;
    render(now);
    if (active || invalidated) queue();
  }

  function queue() {
    if (!pending && !document.hidden) {
      pending = true;
      nextId = window.requestAnimationFrame(tick);
    }
  }

  return {
    start() { invalidated = true; queue(); },
    invalidate() { invalidated = true; queue(); },
    pause() { if (nextId) cancelAnimationFrame(nextId); nextId = 0; pending = false; },
  };
}
