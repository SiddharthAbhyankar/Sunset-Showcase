# sunset — a golden hour gallery

A one-page WebGL photography gallery: images ride an infinite 3D spiral driven
by inertial scrolling, with depth-of-field and motion blur, a spiral/list view
toggle, a fullscreen lightbox, a menu overlay, a rotating corner badge, and a
synthesized ambient soundscape.

Built with Vite, Three.js, and GSAP.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```

## Using your own photos

1. Drop image files into `public/images/` (create the folder if needed).
2. In [src/data.js](src/data.js), set each entry's `src`, e.g.

   ```js
   { title: 'golden hour', year: '2026', orientation: 'landscape', src: '/images/golden-hour.jpg' },
   ```

3. Set `orientation` to `'landscape'` or `'portrait'` to match the photo —
   the card geometry, lightbox fit, and list layout all follow it.

Entries with `src: null` fall back to a procedurally painted sunset
placeholder ([src/placeholders.js](src/placeholders.js)). Add or remove
entries freely; the spiral adapts to any count.

## Where things live

| File | Responsibility |
| --- | --- |
| `src/gallery.js` | Three.js scene, spiral/list layouts, blur & bend shaders |
| `src/scroll.js` | Virtual inertial scroll (wheel / drag / touch) + snap |
| `src/ui.js` | Intro, menu overlay, lightbox, view toggle, sound button |
| `src/audio.js` | WebAudio ambient pad + surf (no audio files) |
| `src/data.js` | Gallery manifest (titles, years, orientation, srcs) |
