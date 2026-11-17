# THE ASCENT — V7.1 immersive motion restored

Static, GitHub Pages-compatible site. This version retains the approved V6.3 visual storytelling, orbit, StairMaster, character and contact placeholder. **The contact form intentionally still opens `mailto:hello@example.com`.**

## Deploy

Upload/extract the **contents** of the ZIP directly at the root of your GitHub Pages repository. `index.html` must be at the repository root, beside `css/`, `js/`, and `assets/`. No npm, installation, or build step is required to deploy.

The site requires an internet connection for the pinned Three.js 0.170.0 modules, the Helvetiker 3D text font JSON, and Google Fonts, which remain served from CDNs. All custom images and GLB models are included locally. Using a CDN is valid for GitHub Pages but not fully offline/self-hosted. Keep the entire folder structure.

## What changed, technically

- Site styles moved to `css/site.css`. The Three.js scene, camera sampler, contact handler, adaptive resolution, frame scheduler and performance diagnostics are organized as ES modules in `js/`.
- Console artwork converted to WebP (1983 × 793 pixels), with the original text preserved at quality 90. The new file path is `assets/textures/console-display.webp`.
- Rendering begins at an adaptive device pixel ratio instead of always using a high DPR. Under sustained load the quality manager gradually adjusts DPR. It does **not** change the mountain geometry, model detail or text timing.
- Rendering is demand-driven during idle gym portions; an animation loop at a capped 24–30 FPS runs when the transition snowstorm or mountain scene is visible, allowing snow and flag motion to remain immersive. Rendering pauses on hidden tabs and when the user has left the journey section. The GPU resources remain allocated while the tab is open.
- Both the procedural mountain snowfall and the 2D transition snowstorm animate again while visible. The flag continues waving, with its wave propagation now traveling **outward from the pole** rather than inward. The pole-edge vertices stay anchored. The StairMaster steps still move with scrolling, as originally designed.
- Step materials are indexed once rather than traversing all step meshes on each frame. Shared scene material settings are no longer rewritten every frame. Only the visible scene group is updated; the other group is hidden. Three.js's built-in *frustum culling* remains enabled. **Full GPU occlusion culling is not implemented**, as it could change the visibility of the character/text or add complexity without a measured benefit.
- `?debug=1` displays a diagnostic overlay with sampled FPS, frame times, draw calls, triangle count, geometry/texture counts, pixel ratio and selected performance preset. This overlay is not a substitute for testing on actual mobile/low-power GPUs.

## Testing

Recommended checks (desktop, recent phone, older laptop): open the site over HTTPS, add `?debug=1`, scroll through the three StairMaster text sections, pass under the console, reach the mountain, and keep scrolling through the summit. Compare the FPS, frame times and DPR at the same camera positions. Check that the final orbit and contact handoff are unchanged.

**Important:** Automated headless Chromium in the build environment blocked access to the local server, so no verified browser screenshot, FPS benchmark, or device compatibility claim is included. JavaScript syntax, local file references and ZIP integrity were checked. CDN imports must be reachable when the page is served.

## Reload behavior (V7.2)
Refreshing the page now returns to the beginning of the journey. Native back/forward navigation and normal in-page links keep their usual behavior. No change to 3D modules or assets.
