(function () {
  // helper: click if exists
  const click = (sel) => { const el = document.querySelector(sel); if (el) el.click(); };

  // helper: click any button containing text
  const clickTextBtn = (needle) => {
    const n = needle.toLowerCase();
    const btns = Array.from(document.querySelectorAll('button, ytd-button-renderer, tp-yt-paper-button, div[role="button"]'));
    for (const b of btns) {
      const t = (b.innerText || b.textContent || '').trim().toLowerCase();
      if (t && t.includes(n)) { b.click(); return true; }
    }
    return false;
  };

  const tick = () => {
    const player = document.querySelector('.html5-video-player');
    const video  = document.querySelector('video');

    // 1) Skip ads (or fast-forward unskippables)
    if (player && player.classList.contains('ad-showing')) {
      // new/old skip buttons
      click('.ytp-ad-skip-button-modern, .ytp-ad-skip-button');
      if (video) {
        // sprint through unskippable segments
        if (video.playbackRate < 16) video.playbackRate = 16;
        if (video.paused) video.play().catch(()=>{});
      }
    } else if (video && video.playbackRate > 1.0) {
      // restore normal speed after ad finishes
      video.playbackRate = 1.0;
    }

    // 2) Auto-continue when YT pauses with a dialog/overlay
    // Common cases: “Video paused. Continue watching?” or overlays with a big button
    clickTextBtn('continue');       // e.g., “Continue watching”
    clickTextBtn('yes');            // sometimes it’s just “Yes”
    click('.ytp-autonav-endscreen-cancel-button'); // occasionally helpful

    // 3) If video got paused without user input, resume it
    if (video && video.paused) {
      // Try not to interfere during menus/shorts, but keep it simple in kiosk:
      video.play().catch(()=>{});
    }
  };

  // run often but cheap
  setInterval(tick, 500);
})();
