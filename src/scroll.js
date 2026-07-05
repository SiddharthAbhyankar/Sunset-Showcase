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

    // very subtle idle auto-drift: hints that the gallery scrolls. Runs once
    // enabled, pauses on manual input, resumes after driftResumeDelay.
    this.autoDrift = false;
    this.driftSpeed = 0.0016;      // ~one card every ~10s
    this.driftResumeDelay = 2600;  // ms of stillness before drift kicks back in

    this.dragging = false;
    this.lastInputAt = 0;
    this.lastY = 0;
    this.lastX = 0;
    this.downY = 0;
    this.downX = 0;

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
    this.target += delta * 0.0026;
    this.lastInputAt = performance.now();
  }

  onPointerDown(e) {
    if (!this.enabled) return;
    this.dragging = true;
    this.downX = this.lastX = e.clientX;
    this.downY = this.lastY = e.clientY;
    this.lastInputAt = performance.now();
    this.el.classList.add('is-grabbing');
  }

  onPointerMove(e) {
    if (!this.dragging) return;
    const dy = e.clientY - this.lastY;
    // drag down advances (matches wheel: down = forward)
    this.target += dy * 0.0064;
    this.lastY = e.clientY;
    this.lastX = e.clientX;
    this.lastInputAt = performance.now();
  }

  onPointerUp() {
    this.dragging = false;
    this.el.classList.remove('is-grabbing');
  }

  // Was this a tap, not a drag? Measure straight-line displacement from the
  // press point so a jittery finger during a tap still counts as a click.
  wasClick() {
    return Math.hypot(this.lastX - this.downX, this.lastY - this.downY) < 12;
  }

  scrollTo(value) {
    this.target = value;
    this.lastInputAt = performance.now();
  }

  update() {
    const idleFor = performance.now() - this.lastInputAt;
    const settled = this.enabled && !this.dragging;

    if (settled && this.autoDrift && idleFor > this.driftResumeDelay) {
      // continuous gentle creep forward; no snap so it stays smooth
      this.target += this.driftSpeed;
    } else if (settled && idleFor > 260) {
      // gentle magnetic snap to the nearest card once manual input settles
      const snapped = Math.round(this.target / this.snapStep) * this.snapStep;
      this.target += (snapped - this.target) * 0.065;
    }

    const prev = this.current;
    this.current += (this.target - this.current) * 0.082;
    this.velocity = this.current - prev;
  }
}
