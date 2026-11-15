# THE ASCENT — V2.9 Story & Scroll

## Overview
The original Three.js / WebGL scroll experience, with separate StairMaster GLB files, updated screen texture, downward-travelling stairs driven **only** by scroll, and Liam’s five-chapter story.

## Updates
- `assets/textures/console-display.png` shows **Goal: Top of Mount Everest**, red flag, and the 8,849 m challenge.
- StairMaster treads are linked to scroll, not to elapsed time. When the visitor scrolls down, the visible treads move down underfoot. Scrolling up reverses that motion; not scrolling leaves them still.
- Five story beats: Meet Liam, The Dream, The Challenge, The Bigger Picture, The Journey. No visible chapter numbering; text remains centered and subtle.
- The mountain climb, summit character, flag animation and separate StairMaster model assets are preserved.

## Run
Serve the unzipped project over HTTP(S), for example with GitHub Pages. Direct `file://` browsing can block GLB loading. Three.js and GLTFLoader are currently loaded from jsDelivr and require internet access.

## Contents
```
index.html
README.md
assets/models/stairmaster-frame.glb
assets/models/stairmaster-step.glb
assets/textures/console-display.png
```

## Notes
The contact form is currently a mailto demo with a placeholder address; update this before publishing. The 8,849 m figure expresses the Everest elevation target, not a verified number of steps. 3D visual rendering should be checked in your browser.
