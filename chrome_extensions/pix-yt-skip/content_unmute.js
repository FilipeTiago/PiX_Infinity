(function(){
  function kick(){
    try{
      const v = document.querySelector('video');
      if (v) { v.muted = false; v.volume = 1.0; }
      const w = window;
      const p = (w.yt && w.yt.player && w.yt.player.getPlayerByElement)
                ? w.yt.player.getPlayerByElement('movie_player') : null;
      if (p) {
        try { p.unMute?.(); } catch(e){}
        try { p.setVolume?.(100); } catch(e){}
      }
      // poke common UI
      const vol = document.querySelector('.ytp-mute-button,.ytp-unmute');
      if (vol) vol.dispatchEvent(new MouseEvent('click', {bubbles:true}));
    }catch{}
  }
  function ramp(ms=5000, step=300){
    let t=0;
    kick();
    const id = setInterval(()=>{ kick(); t+=step; if (t>=ms) clearInterval(id); }, step);
  }

  const fire = () => ramp();
  document.addEventListener('yt-navigate-finish', fire, {passive:true});
  document.addEventListener('DOMContentLoaded', fire, {once:true});
  // for initial load and ad transitions
  ramp();
  new MutationObserver((m)=>{ for(const x of m){ if (x.addedNodes?.length) ramp(1800,250); }})
    .observe(document.documentElement,{subtree:true,childList:true});
})();
