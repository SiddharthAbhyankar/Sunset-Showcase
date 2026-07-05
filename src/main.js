import './style.css';
import { IMAGES } from './data.js';
import { VirtualScroll } from './scroll.js';
import { Gallery } from './gallery.js';
import { Ambient } from './audio.js';
import { initUI } from './ui.js';

const container = document.getElementById('webgl');

const scroll = new VirtualScroll({ el: container, snapStep: 1 });
const gallery = new Gallery({ container, images: IMAGES, scroll });
const ambient = new Ambient();

initUI({ gallery, scroll, ambient });

function tick() {
  scroll.update();
  gallery.update();
  requestAnimationFrame(tick);
}
tick();
