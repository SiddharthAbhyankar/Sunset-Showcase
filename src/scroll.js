// Virtual inertial scroll: wheel + touch + pointer drag feed a target value,
// the current value eases toward it every frame. When idle, the target
// snaps gently to the nearest card so one image always sits in focus.

export class VirtualScroll {
  constructor({ el, snapStep = 1 }) {
    this.el = el;
    this.snapStep = snapStep;

    this.target = 0;
    this.current = 0;
    this.velocity = 0;
    this.enabled = false;

    this.dragging = false;
    this.pointerMoved = 0;
    this.lastInputAt = 0;
    this.lastY = 0;
    this.lastX = 0;

    this.onWheel = this.onWheel.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);

    window.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  onWheel(e) {
    if (!this.enabled) return;
    e.preventDefault();
    const delta = Math.max(-140, Math.min(140, e.deltaY));
    this.target += delta * 0.0021;
    this.lastInputAt = performance.now();
  }

  onPointerDown(e) {
    if (!this.enabled) return;
    this.dragging = true;
    this.pointerMoved = 0;
    this.lastY = e.clientY;
    this.lastX = e.clientX;
    this.lastInputAt = performance.now();
    this.el.classList.add('is-grabbing');
  }

  onPointerMove(e) {
    if (!this.dragging) return;
    const dy = e.clientY - this.lastY;
    const dx = e.clientX - this.lastX;
    this.pointerMoved += Math.abs(dy) + Math.abs(dx);
    this.target -= dy * 0.0052;
    this.lastY = e.clientY;
    this.lastX = e.clientX;
    this.lastInputAt = performance.now();
  }

  onPointerUp() {
    this.dragging = false;
    this.el.classList.remove('is-grabbing');
  }

  // Was this pointerup a click (vs a drag)?
  wasClick() {
    return this.pointerMoved < 6;
  }

  scrollTo(value) {
    this.target = value;
    this.lastInputAt = performance.now();
  }

  update() {
    const idleFor = performance.now() - this.lastInputAt;

    // gentle magnetic snap to the nearest card once input settles
    if (this.enabled && !this.dragging && idleFor > 260) {
      const snapped = Math.round(this.target / this.snapStep) * this.snapStep;
      this.target += (snapped - this.target) * 0.065;
    }

    const prev = this.current;
    this.current += (this.target - this.current) * 0.082;
    this.velocity = this.current - prev;
  }
}
