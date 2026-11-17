/**
 * Conservative pixel density adaptation. Scaling the WebGL drawing buffer on a
 * moving scene can briefly clear the canvas and cost a frame, so quality is
 * lowered only after repeated sustained slow samples. Never bounce back up
 * during a session; reload resets to the normal preset.
 */
export class AdaptiveQuality {
  constructor(renderer) {
    this.renderer=renderer;
    this.nativeDpr=Math.min(window.devicePixelRatio||1,1.75);
    this.isMobile=window.matchMedia('(pointer: coarse)').matches;
    this.pixelRatio=Math.min(this.nativeDpr,this.isMobile?1.2:1.5);
    this.minDpr=Math.min(this.pixelRatio,this.isMobile?0.8:1);
    this.preset=this.isMobile?'mobile':'desktop';
    this.flagFrameInterval=this.isMobile?1000/24:1000/30;
    this.slowWindows=0;
    this.lastChange=performance.now();
    this.width=innerWidth;
    this.height=innerHeight;
    renderer.setPixelRatio(this.pixelRatio);
  }
  resize(width,height){
    this.width=width;this.height=height;
    // Avoid reallocating the GPU drawing buffer twice for a single resize.
    this.renderer.setSize(width,height,false);
  }
  observe(sample, {scrolling=false}={}) {
    if(!sample?.continuous || !Number.isFinite(sample.fps)) return;
    // Count repeated slow windows while moving, but defer any buffer resize
    // until scrolling settles. This avoids a visible flash during the journey.
    if(sample.fps<(this.isMobile?18:24))this.slowWindows++;
    else this.slowWindows=Math.max(0,this.slowWindows-1);
    if(scrolling || this.slowWindows<4 || performance.now()-this.lastChange<12000)return;
    if(this.pixelRatio>this.minDpr+.04){
      const next=Math.max(this.minDpr,Math.round((this.pixelRatio-.10)*100)/100);
      this.pixelRatio=next;
      this.renderer.setPixelRatio(next);
      // setPixelRatio triggers a resize and internally resets the drawing buffer.
      this.lastChange=performance.now();
    }
    this.slowWindows=0;
  }
}
