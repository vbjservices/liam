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

## V7.3 — Fly into the goal display

The end of the StairMaster camera path is now aligned with the Everest screen at world coordinates `(0, 5.74, -2.426)`. After “EVERY STEP COUNTS”, the camera glides upward to face the screen, approaches its centre, and crosses its plane during the existing snow/mist wipe. The mountain camera sequence resumes beyond the screen. Nothing in the model, console artwork, type, summit, or contact section has changed.


## V7.4 stability improvements
- Prevents the illustrated fallback appearing during GPU buffer changes and loading handoffs.
- Loader stays until the first frame and core asset/font requests complete.
- Batches all component meshes of each StairMaster tread into one geometry where possible. Preserves tread vertex colours, individual step movement, and fade, with automatic fallback to original meshes if batching fails.
- Stabilizes adaptive quality: no pixel-ratio changes while scrolling, only steps down after repeated slow idle samples, and never oscillates upward during the session.
- Avoids duplicate canvas resizing and redundant camera projection matrix updates.
- Keeps the snowstorm, mountain snowfall, scroll-driven steps, and summit flag animation.

Note: performance HUD FPS changes between idle and scroll because idle rendering is throttled. GPU frame time cannot be inferred reliably from FPS alone.

## V7.5 — Mountain caption entrance

Delays the mountain chapter captions to begin after the white-out has cleared. Keeps the same scene geometry, scroll path, snowstorm, logo, character, and camera. Uses a uniform +12.5%-of-camera-progress offset to preserve the original caption pacing, plus a soft reveal guard around camera progress 0.625–0.705.


## V7.6 update
- Added a lightweight Everest-style mini base camp near the first trail marker after the StairMaster transition.
- Added colorful prayer flags and two low-poly tents without introducing external assets.
- Adjusted the first mountain text to fade in right after the transition clears.


## V7.7 update
- Refined the Everest mini base camp so it sits on the mountain slope instead of on a thin floating plateau.
- Replaced dome tents with more pointy ridge-tent shapes.
- Rebuilt the prayer flags with proper multicolour pennants inspired by Everest base-camp flags.
- Slightly delayed the first mountain text fade so it starts right after the transition clears.


## V7.8 update
- Moved the mini base camp onto the trail edge, just left of the yellow flag.
- Removed the visually distracting large floating slice/plateau behind the camp.
- Kept the pointier tents and Everest-style multicolour prayer flags.


## V7.9 update
- Removed the thin snow patch that could appear as a vertical slice through the camp.
- Moved the camp further left, still next to the yellow flag on the trail edge.


## V8.0 refinements
- Turned the red tent 90 degrees counterclockwise and aimed the yellow door toward it.
- Prayer flags remain static: reduced widths based on rope length and corrected tangent alignment prevent overlapping surfaces and flicker.
- First mountain chapter fades in faster, just after the white-out has cleared.
- No changes to camera paths, assets, summit, moving snowfall, or contact form.


## V8.1
Only the red and yellow tent rotations were adjusted for diagonally camera-facing entrances; no other scene or timing changes.


## V8.2
Moved only the red tent 0.33 world units to the left to separate it from the yellow tent. Angles and all other features unchanged.


## V8.3 — Summit cleanup
Removed only the rectangular access ledge (the distracting white slab). Summit rocks, climber, boot grounding, flag, and all other geometry and motion are unchanged.


## V8.4
Red tent only: raised by 0.075 scene units, with a subtle -0.055 rad Z tilt to keep its left edge out of the slope.


## V8.5 — Camp introduction (prototype)

The existing camera journey, texts, and summit are preserved. A 1.5-screen-height camp chapter has been inserted near the first yellow trail marker. The camera moves close to a new 3D wooden photo board, with the board framed left and new introduction copy rising at the right; afterwards it returns to the pre-existing camera progression.

**Photo replacement:** Replace `assets/textures/liam-photo-placeholder.webp` with a real 550×700 (or similar portrait-aspect) image using the same filename. No code change needed.

No other assets were replaced. Console artwork, models and external Three.js dependencies are unchanged.


Update: camp introduction board reduced in size and repositioned beneath/between the prayer flags. Camera focus retuned for the smaller board.


Update: noticeboard moved behind the tents / flag poles and camp focus zoom tightened.


## V8.8 Clear camp-board framing
- Moved the wooden board substantially farther behind the tents and prayer-flag poles.
- Seated the board posts on the sampled mountain slope.
- Redirected the close-up camera to approach from the open left side, avoiding tent and flag obstruction.
- Kept all earlier scenes, captions and scrolling chronology unchanged.


## V8.9 cinematic camp passage
- Board shifted right locally (-1.15 to -0.87); tents and poles unchanged.
- Camp chapter extended from 1.50 to 2.35 viewport heights, with entry delayed slightly.
- Camera travels below the prayer flags toward the board in two stages.
- Right-hand introduction text begins after the closer camera framing settles.
- Exit merges into a later waypoint on the existing mountain path, avoiding a reverse zoom; original later camera keyframes are preserved.
- Only `js/main.js` and `css/site.css` changed; retain original local assets.


## V9.0 — Counterclockwise camp exit
The close-up and text entrance are unchanged. From 80% of the camp chapter, the camera makes a counterclockwise arc around Liam's board, turns towards the trail, and rejoins the existing mountain camera route at the exact end of the chapter. The exit no longer interpolates straight backward to a wide camp frame.

## V9.1 revisions
- Reversed the exit orbit around Liam's camp noticeboard, retaining the original mountain-camera rail.
- Darkened the camp-only scrim to increase the contrast of the right-side introduction text.
- Shortened scroll needed for the mountain-to-board camera approach by ~30% inside the camp chapter.
- Used the user-provided photograph for the noticeboard as `assets/textures/liam-photo.webp`, centre-cropped to a portrait aspect ratio without distortion.
- The rest of the site and existing assets are unchanged.


## V9.2 · Forward orbit handoff
- Keeps V9.1 camp approach, board photo, text and tint.
- Adds 0.70 viewport-heights of scroll exclusively for the camp exit arc.
- Orbits the board with a changing camera height, then turns to look along the trail.
- Joins the existing mountain rail at a fixed forward waypoint with a cubic Bezier path; no reversing to an earlier viewpoint.
- Only js/main.js and css/site.css change.


## V9.3 — camp scroll timing only
- Mountain transition -> camp arrival: 20% shorter scroll (earlier StairMaster and scene keypoints retained).
- Camp arrival -> board close-up: 20% longer scroll for the zoom segment.
- Board exit orbit: 50% longer scroll, preserving its path and direction.
- Journey scroll length and internal story anchors are synchronized with these intervals.
- No model, texture, typography, scene or contact-form changes.


## V9.4: Shorter orbit-to-rail handoff
Preserves the V9.3 orbit timing and curve; shortens only the final forward connection from ~0.73 viewport-heights to 0.34. Updates sticky page height accordingly. No other scene or text modifications.
