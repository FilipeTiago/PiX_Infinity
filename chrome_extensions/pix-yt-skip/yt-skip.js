(function(){
  const d = document;
  const style = d.createElement('style');
  style.textContent = `
    /* hide overlay banners & endscreen cards that look like ads */
    .ytp-ad-image-overlay, .ytp-ad-overlay-slot, .ytp-ad-overlay-close-button,
    ytd-action-companion-ad-renderer, ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"] {
      display: none !important;
    }
  `;
  d.documentElement.appendChild(style);

  let lastRate = 1, forcedRate = 16, wasMuted = false, speeding = false;

  function withPlayer(cb){
    const p = d.querySelector('.html5-video-player');
    if (!p) return;
    const v = p.querySelector('video');
    if (!v) return;
    cb(p, v);
  }

  function skipButtons(){
    const btn = d.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button.ytp-button');
    if (btn) btn.click();
    const close = d.querySelector('.ytp-ad-overlay-close-button');
    if (close) close.click();
  }

  function onAdStart(p, v){
    // mute + speed up non-skippables
    try {
      if (!v.paused) {
        lastRate = v.playbackRate || 1;
        v.playbackRate = forcedRate; speeding = true;
      }
      if (!v.muted) { wasMuted = true; v.muted = true; }
    } catch (_) {}
  }

  function onAdEnd(p, v){
    try {
      if (speeding) { v.playbackRate = lastRate || 1; speeding = false; }
      if (wasMuted) { v.muted = false; wasMuted = false; }
    } catch (_) {}
  }

  // Click-to-skip poller (very cheap)
  setInterval(() => {
    withPlayer((p, v) => {
      if (p.classList.contains('ad-showing')) {
        skipButtons();
        onAdStart(p, v);
      } else {
        onAdEnd(p, v);
      }
    });
  }, 250);

  // Extra: when a skippable appears, hammer the skip for ~1s
  const mo = new MutationObserver(() => skipButtons());
  mo.observe(d.documentElement, {subtree:true, childList:true});
})();
