import * as THREE from 'three';
import gsap from 'gsap';
import { createSunsetCanvas } from './placeholders.js';

// ---------------------------------------------------------------------------
// Shaders: curved plane with directional motion blur and rounded corners.
// ---------------------------------------------------------------------------

const VERT = /* glsl */ `
  uniform float uBend;   // signed, from scroll velocity — flag-like flutter
  uniform float uCurve;  // static cylindrical curve, stronger away from focus
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float PI = 3.141592653589793;
    pos.z += sin(uv.y * PI) * uBend;
    pos.z -= sin(uv.x * PI) * uCurve;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uBlur;      // uv-space blur radius
  uniform vec2 uBlurDir;    // motion direction
  uniform float uOpacity;
  uniform vec2 uSize;       // plane w/h, for rounded-corner sdf
  uniform float uWarm;      // sunset tint on out-of-focus cards
  uniform float uDim;       // darken cards receding into the dusk
  uniform float uImgAspect; // texture width / height
  uniform float uPlaneAspect; // card width / height
  varying vec2 vUv;

  float roundedRect(vec2 uv, vec2 size, float radius) {
    vec2 p = (uv - 0.5) * size;
    vec2 q = abs(p) - (size * 0.5 - radius);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  }

  // object-fit: cover — center-crop the texture to the card's aspect
  vec2 coverUv(vec2 uv) {
    vec2 c = uv - 0.5;
    if (uImgAspect > uPlaneAspect) c.x *= uPlaneAspect / uImgAspect;
    else                           c.y *= uImgAspect / uPlaneAspect;
    return c + 0.5;
  }

  void main() {
    vec2 base = coverUv(vUv);
    vec2 dir = uBlurDir * uBlur;
    vec4 c = vec4(0.0);
    c += texture2D(uMap, base - dir * 1.00) * 0.051;
    c += texture2D(uMap, base - dir * 0.75) * 0.0918;
    c += texture2D(uMap, base - dir * 0.50) * 0.1231;
    c += texture2D(uMap, base - dir * 0.25) * 0.1353;
    c += texture2D(uMap, base)              * 0.1974;
    c += texture2D(uMap, base + dir * 0.25) * 0.1353;
    c += texture2D(uMap, base + dir * 0.50) * 0.1231;
    c += texture2D(uMap, base + dir * 0.75) * 0.0918;
    c += texture2D(uMap, base + dir * 1.00) * 0.051;

    // ember tint bleeding into blurred cards
    vec3 warm = vec3(1.0, 0.62, 0.38);
    c.rgb = mix(c.rgb, warm * dot(c.rgb, vec3(0.299, 0.587, 0.114)), uWarm);
    c.rgb *= uDim;

    float d = roundedRect(vUv, uSize, min(uSize.x, uSize.y) * 0.045);
    float edge = fwidth(d) * 1.5;
    float mask = 1.0 - smoothstep(0.0, edge, d);

    gl_FragColor = vec4(c.rgb, uOpacity * mask);
  }
`;

// ---------------------------------------------------------------------------

const SPACING = 1.0; // phase distance between cards

export class Gallery {
  constructor({ container, images, scroll }) {
    this.container = container;
    this.images = images;
    this.scroll = scroll;

    this.layout = 0;        // 0 = spiral, 1 = list
    this.reveal = 0;        // intro reveal progress
    this.hovered = null;
    this.focusedIndex = 0;

    this.wrap = images.length * SPACING;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    this.camera.position.z = 7;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2(-2, -2);

    this.cards = images.map((img, i) => this.createCard(img, i));

    this.labelEls = this.createLabels();

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pointermove', (e) => {
      this.pointerNdc.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
    });
  }

  createCard(img, i) {
    const landscape = img.orientation === 'landscape';
    const w = landscape ? 2.9 : 1.85;
    const h = landscape ? 1.85 : 2.75;
    const planeAspect = w / h;

    const uImgAspect = { value: planeAspect }; // updated once real image loads

    let texture;
    if (img.src) {
      texture = new THREE.TextureLoader().load(img.src, (t) => {
        if (t.image && t.image.width) {
          uImgAspect.value = t.image.width / t.image.height;
        }
      });
    } else {
      const canvas = createSunsetCanvas({ orientation: img.orientation, seed: i + 3, variant: img.variant });
      texture = new THREE.CanvasTexture(canvas);
      uImgAspect.value = canvas.width / canvas.height;
    }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;

    const geometry = new THREE.PlaneGeometry(w, h, 24, 24);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uMap: { value: texture },
        uBlur: { value: 0 },
        uBlurDir: { value: new THREE.Vector2(0.35, 1.0).normalize() },
        uOpacity: { value: 1 },
        uSize: { value: new THREE.Vector2(w, h) },
        uBend: { value: 0 },
        uCurve: { value: 0 },
        uWarm: { value: 0 },
        uDim: { value: 1 },
        uImgAspect,
        uPlaneAspect: { value: planeAspect },
      },
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.index = i;
    this.scene.add(mesh);

    return { mesh, material, img, i, w, h, phase: 0, focus: 0, hoverT: 0 };
  }

  createLabels() {
    const holder = document.getElementById('labels');
    return this.cards.map((card) => {
      const el = document.createElement('div');
      el.className = 'card-label';
      el.innerHTML = `
        <span class="label-index">${String(card.i + 1).padStart(2, '0')}</span>
        <span class="label-title">${card.img.title}</span>
        <span class="label-year">${card.img.year}</span>`;
      holder.appendChild(el);
      return el;
    });
  }

  wrapPhase(p) {
    const half = this.wrap / 2;
    return ((p % this.wrap) + this.wrap * 1.5) % this.wrap - half;
  }

  setLayout(mode) {
    gsap.to(this, {
      layout: mode === 'list' ? 1 : 0,
      duration: 1.25,
      ease: 'expo.inOut',
    });
  }

  // Reveal cards after the intro screen is dismissed.
  enter() {
    this.scroll.current = -2.6;
    this.scroll.target = 0;
    this.scroll.enabled = true;
    this.scroll.autoDrift = true; // subtle idle drift hints the gallery scrolls
    gsap.to(this, { reveal: 1, duration: 1.9, ease: 'power3.out' });
  }

  // World position for a card in each layout, given its wrapped phase.
  spiralPosition(p, out) {
    const a = p * 0.92;
    out.x = Math.sin(a) * this.swingX;
    out.y = -p * this.stepY;
    out.z = (Math.cos(a) - 1) * 2.1;
    return out;
  }

  listPosition(p, card, out) {
    out.x = this.listX;
    out.y = -p * (this.listRow * 1.18);
    out.z = 0;
    return out;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // list geometry targets, in world units at z=0
    const viewH = 2 * this.camera.position.z * Math.tan((this.camera.fov * Math.PI) / 360);
    const viewW = viewH * this.camera.aspect;
    this.viewH = viewH;
    this.viewW = viewW;
    this.listRow = viewH * 0.24;         // uniform card height in list mode
    this.listX = viewW * (w < 700 ? 0 : 0.16);

    // spiral geometry scales with the viewport so the composition
    // holds at any aspect ratio
    this.swingX = viewW * 0.30;
    this.stepY = viewH * 0.295;
  }

  raycast() {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.cards.map((c) => c.mesh));
    return hits.length ? this.cards[hits[0].object.userData.index] : null;
  }

  // Screen-space rect of a card (for the lightbox FLIP animation).
  screenRect(card) {
    const mesh = card.mesh;
    const corners = [
      new THREE.Vector3(-card.w / 2, -card.h / 2, 0),
      new THREE.Vector3(card.w / 2, -card.h / 2, 0),
      new THREE.Vector3(-card.w / 2, card.h / 2, 0),
      new THREE.Vector3(card.w / 2, card.h / 2, 0),
    ];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of corners) {
      c.applyMatrix4(mesh.matrixWorld).project(this.camera);
      const sx = (c.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-c.y * 0.5 + 0.5) * window.innerHeight;
      minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  update() {
    const vel = this.scroll.velocity;
    const L = this.layout;
    const spiralPos = new THREE.Vector3();
    const listPos = new THREE.Vector3();

    let bestFocus = -1;

    for (const card of this.cards) {
      const raw = card.i * SPACING + this.scroll.current;
      const p = this.wrapPhase(raw);
      card.phase = p;

      this.spiralPosition(p, spiralPos);
      this.listPosition(p, card, listPos);

      const mesh = card.mesh;
      mesh.position.lerpVectors(spiralPos, listPos, L);

      // intro: cards rise from below while fading in
      mesh.position.y -= (1 - this.reveal) * 4.5;

      const a = p * 0.92;
      mesh.rotation.y = -Math.sin(a) * 0.42 * (1 - L);
      mesh.rotation.z = -Math.sin(a) * 0.13 * (1 - L);
      mesh.rotation.x = 0;

      // focus: 1 at center, 0 far away
      const focus = 1 - Math.min(1, Math.abs(p) / 2.3);
      card.focus = focus;
      if (focus > bestFocus) {
        bestFocus = focus;
        this.focusedIndex = card.i;
      }

      // hover lift on the focused card
      const isHover = this.hovered === card && Math.abs(p) < 0.5 && L < 0.5;
      card.hoverT += ((isHover ? 1 : 0) - card.hoverT) * 0.12;

      // scale: focused card grows in spiral mode; list mode is uniform
      const spiralScale = (0.64 + focus * 0.38) * (1 + card.hoverT * 0.045);
      const listScale = (this.listRow / card.h);
      const s = spiralScale * (1 - L) + listScale * L;
      mesh.scale.setScalar(s * (0.6 + this.reveal * 0.4));

      const u = card.material.uniforms;

      // blur: depth-of-field away from focus (spiral only) + motion blur
      const dofBlur = Math.pow(1 - focus, 1.6) * 0.045 * (1 - L);
      const motionBlur = Math.min(0.06, Math.abs(vel) * 0.55);
      u.uBlur.value = dofBlur + motionBlur;
      u.uWarm.value = Math.pow(1 - focus, 2.0) * 0.35 * (1 - L);
      u.uDim.value = THREE.MathUtils.lerp(0.42 + 0.58 * focus, 1, L);

      // bend: velocity flutter + static curve away from focus
      u.uBend.value += (THREE.MathUtils.clamp(-vel * 6.0, -0.55, 0.55) - u.uBend.value) * 0.1;
      u.uCurve.value = (0.06 + (1 - focus) * 0.22) * (1 - L);

      // fade near the wrap seam
      const half = this.wrap / 2;
      const seamFade = 1 - THREE.MathUtils.smoothstep(Math.abs(p), half - 1.6, half - 0.35);
      u.uOpacity.value = seamFade * this.reveal;

      mesh.visible = seamFade > 0.01;

      // list labels track their card
      const label = this.labelEls[card.i];
      if (L > 0.02 && mesh.visible) {
        const anchor = new THREE.Vector3(
          this.listX - (this.listRow / card.h) * card.w * 0.5 - this.viewW * 0.035,
          mesh.position.y,
          0
        ).project(this.camera);
        const sx = (anchor.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-anchor.y * 0.5 + 0.5) * window.innerHeight;
        label.style.opacity = (L * seamFade * this.reveal).toFixed(3);
        label.style.transform = `translate(${sx}px, ${sy}px) translate(-100%, -50%)`;
      } else {
        label.style.opacity = '0';
      }
    }

    // pointer feedback
    if (this.scroll.enabled && !this.scroll.dragging) {
      this.hovered = this.raycast();
      this.container.classList.toggle('is-pointer', !!this.hovered);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
