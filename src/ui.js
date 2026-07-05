import gsap from 'gsap';

export function initUI({ gallery, scroll, ambient }) {
  // ---------- intro ----------
  const intro = document.getElementById('intro');
  const soundBtn = document.getElementById('sound-btn');

  function enter(withSound) {
    if (withSound) {
      ambient.toggle(true);
      soundBtn.classList.add('is-on');
      soundBtn.setAttribute('aria-pressed', 'true');
    }
    gsap.to(intro, {
      opacity: 0,
      duration: 0.9,
      ease: 'power2.inOut',
      onComplete: () => intro.remove(),
    });
    gsap.fromTo('.intro-inner', { y: 0 }, { y: -40, duration: 0.9, ease: 'power2.in' });
    gallery.enter();
  }

  document.getElementById('enter-sound').addEventListener('click', () => enter(true));
  document.getElementById('enter-silent').addEventListener('click', () => enter(false));

  // ---------- sound toggle ----------
  soundBtn.addEventListener('click', () => {
    const on = !ambient.playing;
    ambient.toggle(on);
    soundBtn.classList.toggle('is-on', on);
    soundBtn.setAttribute('aria-pressed', String(on));
  });

  // ---------- spiral / list toggle ----------
  const viewToggle = document.querySelector('.view-toggle');
  const viewThumb = document.querySelector('.view-toggle-thumb');
  const viewBtns = document.querySelectorAll('.view-btn');

  const thumbBaseLeft = parseFloat(getComputedStyle(viewThumb).left) || 0;

  function moveThumbTo(btn, animate = true) {
    // btn.offsetLeft is already relative to nav's padding box (nav is the
    // offsetParent); subtract only the thumb's own static `left` baseline.
    const x = btn.offsetLeft - thumbBaseLeft;
    const w = btn.offsetWidth;
    if (animate) {
      gsap.to(viewThumb, { x, width: w, duration: 0.5, ease: 'expo.out' });
    } else {
      gsap.set(viewThumb, { x, width: w });
    }
  }

  moveThumbTo(document.querySelector('.view-btn.is-active'), false);
  window.addEventListener('resize', () =>
    moveThumbTo(document.querySelector('.view-btn.is-active'), false)
  );

  viewBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('is-active')) return;
      viewBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      moveThumbTo(btn);
      gallery.setLayout(btn.dataset.view);
    });
  });

  // ---------- menu overlay ----------
  const menuBtn = document.getElementById('menu-btn');
  const menuOverlay = document.getElementById('menu-overlay');
  const menuLabel = menuBtn.querySelector('.menu-pill-label');
  const menuLinks = menuOverlay.querySelectorAll('.menu-link');
  let menuOpen = false;

  function setMenu(open) {
    menuOpen = open;
    document.body.classList.toggle('menu-open', open);
    menuBtn.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuOverlay.setAttribute('aria-hidden', String(!open));
    menuOverlay.classList.toggle('is-open', open);
    menuLabel.textContent = open ? menuLabel.dataset.close : menuLabel.dataset.open;
    scroll.enabled = !open && !lightboxOpen && !document.getElementById('intro');

    if (open) {
      gsap.to(menuOverlay, { autoAlpha: 1, duration: 0.55, ease: 'power2.out' });
      gsap.fromTo(
        menuLinks,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.07, ease: 'power3.out', delay: 0.1 }
      );
      gsap.fromTo('.menu-footer', { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.4 });
    } else {
      gsap.to(menuOverlay, { autoAlpha: 0, duration: 0.4, ease: 'power2.in' });
    }
  }

  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  menuOverlay.querySelectorAll('[data-menu-close]').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.preventDefault();
      setMenu(false);
    })
  );

  // ---------- lightbox ----------
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  let lightboxOpen = false;
  let lightboxIndex = 0;

  // fullscreen fit rect for a given card's aspect ratio
  function fitRect(card) {
    const margin = Math.min(window.innerWidth, window.innerHeight) * 0.08;
    const availW = window.innerWidth - margin * 2;
    const availH = window.innerHeight - margin * 2;
    const aspect = card.w / card.h;
    let w = availW, h = availW / aspect;
    if (h > availH) { h = availH; w = availH * aspect; }
    return { w, h, x: (window.innerWidth - w) / 2, y: (window.innerHeight - h) / 2 };
  }

  function imgSrc(card) {
    const tex = card.material.uniforms.uMap.value;
    return card.img.src || tex.image.toDataURL('image/jpeg', 0.92);
  }

  function setCaption(card) {
    lightboxCaption.innerHTML = `<span>${card.img.title}</span><span class="cap-year">${card.img.year}</span>`;
  }

  function openLightbox(card) {
    lightboxOpen = true;
    lightboxIndex = card.i;
    scroll.enabled = false;

    lightboxImg.src = imgSrc(card);
    setCaption(card);

    const from = gallery.screenRect(card);
    const to = fitRect(card);

    gsap.set(lightbox, { autoAlpha: 1 });
    lightbox.classList.add('is-open');
    gsap.fromTo(
      lightboxImg,
      { left: from.x, top: from.y, width: from.w, height: from.h },
      { left: to.x, top: to.y, width: to.w, height: to.h, duration: 0.85, ease: 'expo.inOut' }
    );
    gsap.fromTo(
      [lightboxCaption, lightboxClose, lightboxPrev, lightboxNext],
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.5, delay: 0.5, ease: 'power2.out' }
    );
  }

  // step to the next/prev photo without leaving the lightbox
  function navigate(dir) {
    if (!lightboxOpen) return;
    const n = gallery.cards.length;
    lightboxIndex = (lightboxIndex + dir + n) % n;
    const card = gallery.cards[lightboxIndex];

    // keep the gallery in sync so closing returns to this photo
    scroll.scrollTo(scroll.target - card.phase);

    const to = fitRect(card);
    const slide = dir > 0 ? -40 : 40;

    gsap.killTweensOf(lightboxImg);
    gsap.to(lightboxImg, {
      opacity: 0,
      x: slide,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => {
        lightboxImg.src = imgSrc(card);
        setCaption(card);
        gsap.set(lightboxImg, { left: to.x, top: to.y, width: to.w, height: to.h, x: -slide });
        gsap.to(lightboxImg, { opacity: 1, x: 0, duration: 0.34, ease: 'power2.out' });
      },
    });
  }

  function closeLightbox() {
    if (!lightboxOpen) return;
    lightboxOpen = false;
    lightbox.classList.remove('is-open');
    gsap.to(lightbox, {
      autoAlpha: 0,
      duration: 0.45,
      ease: 'power2.in',
      onComplete: () => {
        if (!menuOpen) scroll.enabled = true;
      },
    });
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); navigate(-1); });
  lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); navigate(1); });
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
      if (menuOpen) setMenu(false);
    } else if (lightboxOpen && e.key === 'ArrowRight') {
      navigate(1);
    } else if (lightboxOpen && e.key === 'ArrowLeft') {
      navigate(-1);
    }
  });

  // swipe left/right within the lightbox (mobile)
  let swipeX = null;
  lightbox.addEventListener('pointerdown', (e) => { if (lightboxOpen) swipeX = e.clientX; });
  lightbox.addEventListener('pointerup', (e) => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 50) navigate(dx < 0 ? 1 : -1);
  });

  // ---------- card clicks ----------
  gallery.container.addEventListener('pointerup', (e) => {
    if (!scroll.enabled || !scroll.wasClick()) return;
    // aim the raycaster at the exact release point (touch taps may fire no
    // pointermove, leaving the hover position stale)
    gallery.pointerNdc.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    const card = gallery.raycast();
    if (!card) return;

    if (Math.abs(card.phase) < 0.5 || gallery.layout > 0.5) {
      openLightbox(card);
    } else {
      // bring the clicked card into focus along the shortest path
      scroll.scrollTo(scroll.target - card.phase);
    }
  });
}
