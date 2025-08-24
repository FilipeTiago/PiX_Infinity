(() => {
  // ---------- styles ----------
  const S = document.createElement('style');
  S.textContent = `
  .pix-osk{position:fixed;left:50%;bottom:0;transform:translateX(-50%);
    z-index:2147483647;background:#161923;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial;
    border-top:1px solid #2b2f3a; box-shadow:0 -10px 30px rgba(0,0,0,.55);
    padding:12px; border-radius:14px 14px 0 0; width:min(980px,96vw)}
  .pix-osk.hidden{display:none}
  .pix-osk .title{font-size:12px;opacity:.7;margin:2px 0 8px 4px}
  .pix-osk .rows{display:flex;flex-direction:column;gap:8px}
  .pix-osk .row{display:flex;justify-content:center;gap:8px}
  .pix-osk button{height:46px;min-width:46px;padding:0 10px;border:0;border-radius:8px;
    background:#262b37;color:#fff;font-size:16px;line-height:1;cursor:pointer;outline:none}
  .pix-osk button:active{filter:brightness(1.2)}
  .pix-osk .key-wide{min-width:100px}
  .pix-osk .key-space{min-width:220px}
  .pix-osk .key-faint{opacity:.9}
  `;
  document.documentElement.appendChild(S);

  // ---------- DOM ----------
  const K = document.createElement('div');
  K.className = 'pix-osk hidden'; K.setAttribute('tabindex','-1');
  K.innerHTML = `
    <div class="title">PIX Keyboard</div>
    <div class="rows"></div>`;
  document.documentElement.appendChild(K);
  const rowsEl = K.querySelector('.rows');

  // Prevent losing focus when clicking keyboard
  const stopFocusSteal = e => { e.preventDefault(); e.stopPropagation(); };
  ['pointerdown','mousedown','touchstart'].forEach(t => K.addEventListener(t, stopFocusSteal, true));

  // ---------- state ----------
  let target = null;        // current editable
  let shift = false;        // momentary
  let layer = 'letters';    // 'letters' | 'symbols'
  let hideT = null;

  // ---------- layouts ----------
  const LAYOUTS = {
    letters: [
      '1 2 3 4 5 6 7 8 9 0',
      'q w e r t y u i o p',
      'a s d f g h j k l',
      'Shift z x c v b n m Backspace',
      'Sym ← Space → Enter Hide'
    ],
    symbols: [
      '! @ # $ % ^ & * ( )',
      '- _ = + [ ] { } \\ |',
      '; : \' " , . / ?',
      'Shift < > ~ ` Backspace',
      'ABC ← Space → Enter Hide'
    ]
  };

  function render() {
    rowsEl.textContent = '';
    const layout = LAYOUTS[layer];
    layout.forEach(line => {
      const row = document.createElement('div');
      row.className = 'row';
      line.split(' ').forEach(label => {
        const b = document.createElement('button');
        b.setAttribute('tabindex','-1');
        b.className = 'key';
        let key = label;

        // visual label
        if (label === 'Backspace') { b.textContent = '⌫'; b.classList.add('key-wide'); }
        else if (label === 'Space') { b.textContent = 'Space'; b.classList.add('key-space'); }
        else if (label === 'Enter') { b.textContent = 'Enter'; b.classList.add('key-wide'); }
        else if (label === 'Shift') { b.textContent = 'Shift'; b.classList.add('key-wide'); }
        else if (label === 'Hide')  { b.textContent = 'Hide'; b.classList.add('key-wide','key-faint'); }
        else if (label === 'Sym' || label === 'ABC') { b.textContent = label; b.classList.add('key-wide'); }
        else if (label === '←' || label === '→') { b.textContent = label; b.classList.add('key-wide'); }
        else {
          b.textContent = (shift && layer==='letters' && /^[a-z]$/.test(label)) ? label.toUpperCase() : label;
        }

        b.dataset.key = key;
        row.appendChild(b);
      });
      rowsEl.appendChild(row);
    });

    // show shift state
    rowsEl.querySelectorAll('button').forEach(btn => {
      if (btn.dataset.key === 'Shift') {
        btn.style.filter = shift ? 'brightness(1.35)' : '';
      }
    });
  }

  // ---------- editable detection ----------
  function isEditable(el){
    if (!el) return false;
    if (el.isContentEditable) return true;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT') {
      const t = (el.type||'text').toLowerCase();
      return !['button','submit','checkbox','radio','range','color','file','hidden'].includes(t);
    }
    return false;
  }

  function show(){ K.classList.remove('hidden'); bumpPageBottom(true); }
  function hide(){ K.classList.add('hidden'); bumpPageBottom(false); }

  // Add/remove bottom padding so focused field isn’t hidden under OSK
  let origBodyPadBottom = '';
  function bumpPageBottom(on){
    const b = document.body; if (!b) return;
    if (on){
      if (!origBodyPadBottom) origBodyPadBottom = getComputedStyle(b).paddingBottom;
      b.style.paddingBottom = '280px';
    } else {
      b.style.paddingBottom = origBodyPadBottom;
      origBodyPadBottom = '';
    }
  }

  function setTarget(el){
    target = el;
    if (target) { cancelHide(); show(); }
  }

  function scheduleHide(){
    cancelHide();
    hideT = setTimeout(() => {
      const a = document.activeElement;
      if (!isEditable(a) && !K.contains(a)) hide();
    }, 350); // debounce: avoid first-focus flicker on sites like YouTube
  }
  function cancelHide(){ if (hideT) { clearTimeout(hideT); hideT = null; } }

  document.addEventListener('focusin', e => { if (isEditable(e.target)) setTarget(e.target); }, true);
  document.addEventListener('focusout', () => scheduleHide(), true);

  // ---------- editing helpers ----------
  function ensureTarget(){ if (!isEditable(target)) target = document.activeElement; return isEditable(target); }

  function insertText(txt){
    if (!ensureTarget()) return;
    if (target.isContentEditable) {
      document.execCommand('insertText', false, txt);
      return;
    }
    const start = target.selectionStart ?? target.value.length;
    const end   = target.selectionEnd   ?? target.value.length;
    target.setRangeText(txt, start, end, 'end');
    target.dispatchEvent(new InputEvent('input', {bubbles:true, data:txt, inputType:'insertText'}));
  }

  function backspace(){
    if (!ensureTarget()) return;
    if (target.isContentEditable) {
      document.execCommand('delete'); // deletes selection or char left
      return;
    }
    const start = target.selectionStart ?? 0;
    const end   = target.selectionEnd   ?? 0;
    if (start !== end) {
      target.setRangeText('', start, end, 'start');
    } else if (start > 0) {
      target.setRangeText('', start-1, start, 'start');
    }
    target.dispatchEvent(new InputEvent('input', {bubbles:true, data:null, inputType:'deleteContentBackward'}));
  }

  function moveCaret(dir){
    if (!ensureTarget()) return;
    if (target.isContentEditable) {
      // approximate for CEs
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      sel.collapse(range.endContainer, range.endOffset);
      return;
    }
    const pos = (target.selectionStart ?? 0) + (dir==='left' ? -1 : 1);
    const clamped = Math.max(0, Math.min(target.value.length, pos));
    target.setSelectionRange(clamped, clamped);
  }

  function pressEnter(){
    if (!ensureTarget()) return;
    if (target.tagName === 'TEXTAREA' || target.isContentEditable) {
      insertText('\n');
      return;
    }
    // try to submit the form if there is one
    const form = target.closest('form');
    if (form && typeof form.requestSubmit === 'function') { form.requestSubmit(); return; }
    // fallback: synthetic Enter key
    ['keydown','keypress','keyup'].forEach(t => {
      target.dispatchEvent(new KeyboardEvent(t, {bubbles:true, key:'Enter', code:'Enter'}));
    });
  }

  // ---------- click handling ----------
  K.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const key = b.dataset.key;

    if (key === 'Shift'){ shift = !shift; render(); return; }
    if (key === 'Sym'){ layer = 'symbols'; render(); return; }
    if (key === 'ABC'){ layer = 'letters'; render(); return; }
    if (key === 'Hide'){ hide(); return; }
    if (key === 'Backspace'){ backspace(); return; }
    if (key === 'Enter'){ pressEnter(); return; }
    if (key === '←'){ moveCaret('left'); return; }
    if (key === '→'){ moveCaret('right'); return; }
    if (key === 'Space') { insertText(' '); return; }
    // text key
    let ch = key;
    if (layer === 'letters' && /^[a-z]$/.test(key) && shift) ch = key.toUpperCase();
    insertText(ch);

    // momentary shift: auto-off after a character
    if (shift && layer==='letters' && /^[a-z]$/.test(key)) { shift = false; render(); }
  });

  // ---------- initial render ----------
  render();
})();
