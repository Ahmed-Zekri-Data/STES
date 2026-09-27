// After "add to cart": a glowing drop arcs from the button into the cart
// icon in the navigation bar, which then bounces. Skipped when the visitor
// asked for less motion, or when either end is missing.
export const flyToCart = (from) => {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const target = document.querySelector('nav [aria-label="Panier"]');
  if (!from || !target || !from.animate) return;

  const start = from.getBoundingClientRect();
  const end = target.getBoundingClientRect();
  const x = start.left + start.width / 2;
  const y = start.top + start.height / 2;
  const dx = end.left + end.width / 2 - x;
  const dy = end.top + end.height / 2 - y;

  const drop = document.createElement('div');
  Object.assign(drop.style, {
    position: 'fixed',
    left: `${x}px`,
    top: `${y}px`,
    width: '18px',
    height: '18px',
    borderRadius: '9999px',
    background: 'linear-gradient(135deg, rgb(var(--aqua-400)), rgb(var(--violet-500)))',
    boxShadow: '0 0 20px rgb(var(--aqua-400) / 0.8)',
    pointerEvents: 'none',
    zIndex: 100
  });
  document.body.appendChild(drop);

  const flight = drop.animate(
    [
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 90}px)) scale(1.3)`, opacity: 1, offset: 0.55 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.35)`, opacity: 0.4 }
    ],
    { duration: 720, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' }
  );
  flight.onfinish = () => {
    drop.remove();
    target.animate?.(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.25) rotate(-8deg)' }, { transform: 'scale(1)' }],
      { duration: 380, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    );
  };
};
