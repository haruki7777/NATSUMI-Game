// Extra game bootstraps that run after script.js.
// Keep this file small so the main game center remains stable.

function enhanceStandaloneGameRoutes() {
  const onoButton = document.querySelector('[data-game="ono"]');
  if (!onoButton || onoButton.dataset.standaloneReady === '1') return;

  onoButton.dataset.standaloneReady = '1';
  onoButton.classList.add('standalone-game-link');
  const label = onoButton.querySelector('small');
  if (label) label.textContent = '오노는 전용 페이지에서 더 크게 플레이해요.';

  onoButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign('/ono.html');
  }, { capture: true });
}

function mountFoxPixelPolish() {
  if (document.querySelector('.fox-pixel-stars')) return;
  const layer = document.createElement('div');
  layer.className = 'fox-pixel-stars';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = Array.from({ length: 18 }, (_, index) => `<span style="--x:${(index * 17) % 100}vw;--d:${index % 6}s"></span>`).join('');
  document.body.appendChild(layer);
}

function bootInteractiveGameEnhancements() {
  enhanceStandaloneGameRoutes();
  mountFoxPixelPolish();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootInteractiveGameEnhancements);
} else {
  bootInteractiveGameEnhancements();
}

window.addEventListener('load', enhanceStandaloneGameRoutes);
