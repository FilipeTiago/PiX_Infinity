(() => {
  // Only on watch pages with a playlist (list=)
  const url = new URL(location.href);
  if (url.pathname !== "/watch" || !url.searchParams.get("list")) return;

  // Don’t toggle if user already left FS this session
  const KEY = "pix_autofull_disabled";
  if (sessionStorage.getItem(KEY) === "1") return;

  function isFullscreen() {
    return document.fullscreenElement || document.querySelector(".ytp-fullscreen-button[title*='Exit']");
  }

  function goFullscreen() {
    const btn = document.querySelector(".ytp-fullscreen-button");
    if (!btn) return false;
    // Sometimes player isn’t ready yet; click twice guards benignly
    btn.click();
    if (!isFullscreen()) setTimeout(() => btn.click(), 300);
    return true;
  }

  // If the user exits fullscreen, don’t force it again this session
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) sessionStorage.setItem(KEY, "1");
  });

  let tries = 0;
  const maxTries = 30; // ~15s
  const iv = setInterval(() => {
    if (isFullscreen()) { clearInterval(iv); return; }
    if (goFullscreen()) { clearInterval(iv); return; }
    if (++tries >= maxTries) clearInterval(iv);
  }, 500);
})();
