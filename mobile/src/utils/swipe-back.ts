/** An edge gesture leaves normal horizontal scrolling and map panning alone. */
export function installSwipeBack(back: () => void, canGoBack: () => boolean): () => void {
  let start: { x: number; y: number; at: number } | null = null;
  const begin = (event: TouchEvent) => {
    start = null;
    if (event.touches.length !== 1 || window.innerWidth >= 1024) return;
    const touch = event.touches[0];
    const target = event.target as Element | null;
    if (touch.clientX > 24 || target?.closest('input, textarea, select, video, [contenteditable], .leaflet-container, .discovery-map__frame')) return;
    if (document.querySelector('ion-modal.show-modal, ion-alert.presented, ion-action-sheet.presented')) return;
    start = { x: touch.clientX, y: touch.clientY, at: Date.now() };
  };
  const end = (event: TouchEvent) => {
    const origin = start;
    start = null;
    const touch = event.changedTouches[0];
    if (!origin || !touch || Date.now() - origin.at > 800) return;
    const dx = touch.clientX - origin.x;
    const dy = Math.abs(touch.clientY - origin.y);
    if (dx >= 80 && dy < 60 && dx > dy * 2 && canGoBack()) back();
  };
  const cancel = () => { start = null; };
  document.addEventListener('touchstart', begin, { passive: true });
  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', cancel, { passive: true });
  return () => {
    document.removeEventListener('touchstart', begin);
    document.removeEventListener('touchend', end);
    document.removeEventListener('touchcancel', cancel);
  };
}
