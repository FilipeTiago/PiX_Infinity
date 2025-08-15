(() => {
  try {
    document.title = "[OSK] " + document.title;
    // Also color the scrollbar track as a tell
    const st = document.createElement('style');
    st.textContent = `::-webkit-scrollbar-track{background:#06c16755 !important}`;
    document.documentElement.appendChild(st);
  } catch {}
})();
