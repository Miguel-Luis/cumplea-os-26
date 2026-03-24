// Progreso de scroll → variables CSS y visibilidad de cada escena

const root = document.documentElement;
const scenes = [...document.querySelectorAll('.scene')];
const scrollHint = document.getElementById('scrollHint');

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mapRange = (value, inMin, inMax) => clamp((value - inMin) / (inMax - inMin));

/** En móvil, escenas apiladas con solapamiento suave (evita saltos bruscos entre cortes). */
const narrowMq = window.matchMedia('(max-width: 900px)');
const MOBILE_SCENE_CUTS = [0.205, 0.48, 0.74];
/** Ancho del crossfade en fracción de progreso total (~4% del viaje de scroll). */
const MOBILE_SCENE_BLEND = 0.04;

/**
 * Opacidad 0–1 por escena en móvil: fundidos en los cortes en lugar de encendido/apagado.
 */
function mobileSceneOpacity(sceneIndex, progress) {
  const [c0, c1, c2] = MOBILE_SCENE_CUTS;
  const b = MOBILE_SCENE_BLEND;

  function rampDown(p, cut) {
    if (p <= cut - b) return 1;
    if (p >= cut + b) return 0;
    return (cut + b - p) / (2 * b);
  }

  function rampUp(p, cut) {
    if (p <= cut - b) return 0;
    if (p >= cut + b) return 1;
    return (p - (cut - b)) / (2 * b);
  }

  if (sceneIndex === 0) return rampDown(progress, c0);
  if (sceneIndex === 1) return Math.min(rampUp(progress, c0), rampDown(progress, c1));
  if (sceneIndex === 2) return Math.min(rampUp(progress, c1), rampDown(progress, c2));
  return rampUp(progress, c2);
}

/** scrollY fiable en móvil (algunos WebViews priorizan documentElement). */
function getScrollY() {
  return (
    window.scrollY ??
    window.pageYOffset ??
    document.documentElement.scrollTop ??
    document.body.scrollTop ??
    0
  );
}

/** Altura útil del viewport (iOS: barra URL; visualViewport suele ser más estable). */
function getViewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight;
}

/** maxScroll estable: body/html y alto de vista real. */
function getMaxScroll() {
  const el = document.documentElement;
  const sh = Math.max(
    document.body.scrollHeight,
    el.scrollHeight,
    el.offsetHeight
  );
  const vh = getViewportHeight();
  return Math.max(0, sh - vh);
}

function updateScrollAnimations() {
  const maxScroll = getMaxScroll();
  const scrollY = getScrollY();
  const progress = maxScroll > 0 ? clamp(scrollY / maxScroll, 0, 1) : 0;

  root.style.setProperty('--progress', progress.toFixed(5));
  root.style.setProperty('--hero-shift', `${progress * -120}px`);
  root.style.setProperty('--scene1', mapRange(progress, 0.0, 0.22).toFixed(5));
  root.style.setProperty('--scene2', mapRange(progress, 0.19, 0.5).toFixed(5));
  root.style.setProperty('--scene3', mapRange(progress, 0.46, 0.76).toFixed(5));
  root.style.setProperty('--scene4', mapRange(progress, 0.72, 1.0).toFixed(5));

  const mobileStack = narrowMq.matches;

  if (mobileStack) {
    const opacities = scenes.map((_, i) => mobileSceneOpacity(i, progress));
    let maxIdx = 0;
    let maxOp = opacities[0];
    for (let i = 1; i < opacities.length; i += 1) {
      if (opacities[i] > maxOp) {
        maxOp = opacities[i];
        maxIdx = i;
      }
    }

    scenes.forEach((scene, index) => {
      const o = opacities[index];
      scene.style.opacity = String(o);
      scene.classList.toggle('active', index === maxIdx && maxOp > 0.06);
      scene.style.visibility = o > 0.004 ? 'visible' : 'hidden';
      scene.style.pointerEvents = index === maxIdx && maxOp > 0.35 ? 'auto' : 'none';
      // Escenas posteriores encima durante el crossfade (misma regla que antes: capas ordenadas)
      scene.style.zIndex = o > 0.004 ? String(20 + index) : '0';
      // Sin parallax en el contenedor: evita saltos y pelea con el fundido
      scene.style.transform = 'translate3d(0, 0, 0)';
    });
  } else {
    scenes.forEach((scene, index) => {
      const start = Number(scene.dataset.start);
      const end = Number(scene.dataset.end);
      const local = mapRange(progress, start, end);
      const visible = progress >= start - 0.05 && progress <= end + 0.05;

      scene.classList.toggle('active', visible);
      scene.style.opacity = visible ? '1' : '0';
      scene.style.visibility = '';
      scene.style.pointerEvents = '';
      scene.style.zIndex = '';

      const depth = (local - 0.5) * 50;
      scene.style.transform = `translateY(${visible ? depth * -0.12 : 50}px) scale(${visible ? 1 : 0.98})`;
    });
  }

  if (scrollY > 100) {
    scrollHint.classList.add('hidden');
  } else {
    scrollHint.classList.remove('hidden');
  }
}

// Escritorio: coalescer scroll a un rAF
let scrollRafId = 0;
function onScrollTick() {
  if (narrowMq.matches) return;
  if (scrollRafId) return;
  scrollRafId = requestAnimationFrame(() => {
    scrollRafId = 0;
    updateScrollAnimations();
  });
}

window.addEventListener('scroll', onScrollTick, { passive: true });
window.addEventListener('resize', () => {
  updateScrollAnimations();
  syncMobileScrollLoop();
});
window.addEventListener('load', () => {
  updateScrollAnimations();
  syncMobileScrollLoop();
});

// Móvil: iOS y compañía no emiten "scroll" a cada frame; leemos scrollY en cada rAF del navegador
let mobileLoopId = 0;

function mobileScrollLoop() {
  if (!narrowMq.matches) {
    mobileLoopId = 0;
    return;
  }
  mobileLoopId = requestAnimationFrame(mobileScrollLoop);
  if (document.visibilityState === 'hidden') return;
  updateScrollAnimations();
}

function syncMobileScrollLoop() {
  if (narrowMq.matches && document.visibilityState !== 'hidden') {
    if (!mobileLoopId) {
      mobileLoopId = requestAnimationFrame(mobileScrollLoop);
    }
  } else if (mobileLoopId) {
    cancelAnimationFrame(mobileLoopId);
    mobileLoopId = 0;
  }
}

function onNarrowMqChange() {
  syncMobileScrollLoop();
  updateScrollAnimations();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    updateScrollAnimations();
    syncMobileScrollLoop();
  } else {
    syncMobileScrollLoop();
  }
});

if (window.visualViewport) {
  window.visualViewport.addEventListener(
    'resize',
    () => {
      updateScrollAnimations();
    },
    { passive: true }
  );
}

if (typeof narrowMq.addEventListener === 'function') {
  narrowMq.addEventListener('change', onNarrowMqChange);
} else if (typeof narrowMq.addListener === 'function') {
  narrowMq.addListener(onNarrowMqChange);
}

syncMobileScrollLoop();
updateScrollAnimations();
