// Progreso de scroll → variables CSS y visibilidad de cada escena

const root = document.documentElement;
const scenes = [...document.querySelectorAll('.scene')];
const scrollHint = document.getElementById('scrollHint');

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mapRange = (value, inMin, inMax) => clamp((value - inMin) / (inMax - inMin));

/** En móvil, una sola escena visible a la vez (los rangos data-start/end se solapan y tapaban textos). */
const narrowMq = window.matchMedia('(max-width: 900px)');
const MOBILE_SCENE_CUTS = [0.205, 0.48, 0.74];

function isSceneVisibleMobile(sceneIndex, progress) {
  if (sceneIndex === 0) return progress < MOBILE_SCENE_CUTS[0];
  if (sceneIndex === 1) {
    return progress >= MOBILE_SCENE_CUTS[0] && progress < MOBILE_SCENE_CUTS[1];
  }
  if (sceneIndex === 2) {
    return progress >= MOBILE_SCENE_CUTS[1] && progress < MOBILE_SCENE_CUTS[2];
  }
  return progress >= MOBILE_SCENE_CUTS[2];
}

function updateScrollAnimations() {
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  const scrollY = window.scrollY;
  const progress = maxScroll > 0 ? scrollY / maxScroll : 0;

  root.style.setProperty('--progress', progress.toFixed(5));
  root.style.setProperty('--hero-shift', `${progress * -120}px`);
  root.style.setProperty('--scene1', mapRange(progress, 0.0, 0.22).toFixed(5));
  root.style.setProperty('--scene2', mapRange(progress, 0.19, 0.5).toFixed(5));
  root.style.setProperty('--scene3', mapRange(progress, 0.46, 0.76).toFixed(5));
  root.style.setProperty('--scene4', mapRange(progress, 0.72, 1.0).toFixed(5));

  const mobileStack = narrowMq.matches;

  scenes.forEach((scene, index) => {
    const start = Number(scene.dataset.start);
    const end = Number(scene.dataset.end);
    const local = mapRange(progress, start, end);
    const visible = mobileStack
      ? isSceneVisibleMobile(index, progress)
      : progress >= start - 0.05 && progress <= end + 0.05;

    scene.classList.toggle('active', visible);
    scene.style.opacity = visible ? '1' : '0';

    if (mobileStack) {
      scene.style.visibility = visible ? 'visible' : 'hidden';
      scene.style.pointerEvents = visible ? 'auto' : 'none';
    } else {
      scene.style.visibility = '';
      scene.style.pointerEvents = '';
    }

    const depth = (local - 0.5) * 50;
    scene.style.transform = `translateY(${visible ? depth * -0.12 : 50}px) scale(${visible ? 1 : 0.98})`;
  });

  if (scrollY > 100) {
    scrollHint.classList.add('hidden');
  } else {
    scrollHint.classList.remove('hidden');
  }
}

// Un solo repaint por frame: scroll más fluido en móvil
let scrollRafId = 0;
function onScrollTick() {
  if (scrollRafId) return;
  scrollRafId = requestAnimationFrame(() => {
    scrollRafId = 0;
    updateScrollAnimations();
  });
}

window.addEventListener('scroll', onScrollTick, { passive: true });
window.addEventListener('resize', updateScrollAnimations);
window.addEventListener('load', updateScrollAnimations);
if (typeof narrowMq.addEventListener === 'function') {
  narrowMq.addEventListener('change', updateScrollAnimations);
} else if (typeof narrowMq.addListener === 'function') {
  narrowMq.addListener(updateScrollAnimations);
}

updateScrollAnimations();
