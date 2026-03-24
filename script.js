// Progreso de scroll → variables CSS y visibilidad de cada escena

const root = document.documentElement;
const scenes = [...document.querySelectorAll('.scene')];
const scrollHint = document.getElementById('scrollHint');

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mapRange = (value, inMin, inMax) => clamp((value - inMin) / (inMax - inMin));

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

  scenes.forEach(scene => {
    const start = Number(scene.dataset.start);
    const end = Number(scene.dataset.end);
    const local = mapRange(progress, start, end);
    const visible = progress >= start - 0.05 && progress <= end + 0.05;
    scene.classList.toggle('active', visible);
    scene.style.opacity = visible ? '1' : '0';

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

updateScrollAnimations();
