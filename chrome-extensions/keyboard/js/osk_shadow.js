(() => {
  let host, root, fab, kb, target=null, shift=false, visible=false, mode='alpha';

  // Alpha layout (letters, digits, punctuation)
  const ROWS_ALPHA = [
    ['1','2','3','4','5','6','7','8','9','0','-','='],
    ['q','w','e','r','t','y','u','i','o','p','[',']','\\'],
    ['a','s','d','f','g','h','j','k','l',';','\''],
    ['{SHIFT}','z','x','c','v','b','n','m',',','.','/','{BKSP}'],
    ['{SYM}','{SPACE}','{ENTER}','{CLOSE}']
  ];

  // Symbols layout (extra punctuation, math, currency)
  const ROWS_SYMBOLS = [
    ['~','`','!','@','#','$','%','^','&','*','(',')'],
    ['_','+','=','-','|','\\','/','?','<','>','[',']'],
    ['{','}',';',':','\'','"','.',',','•','·','§'],
    ['€','£','¥','₿','©','®','±','×','÷','°','₹','{BKSP}'],
    ['{ABC}','{SPACE}','{ENTER}','{CLOSE}']
  ];

  // Shift map for alpha layout (applies when shift is ON)
  const SHIFT_MAP = {
    '1':'!','2':'@','3':'#','4':'$','5':'%','6':'^','7':'&','8':'*','9':'(','0':')',
    '-':'_','=':'+',';':':','\'':'"','\\':'|','[':'{',']':'}',',':'<','.':'>','/':'?'
  };

  const styleCSS = `
    :host { all: initial; }
    .fab{
      position:fixed; right:12px; bottom:12px; width:48px; height:48px;
      border-radius:50%; background:#2758ff; color:#fff; display:flex;
      align-items:center; justify-content:center; font:700 20px system-ui;
      z-index:2147483647; box-shadow:0 8px 24px rgba(0,0,0,.35); cursor:pointer;
      user-select:none;
    }
    .wrap{
      position:fixed; left:50%; transform:translateX(-50%);
      bottom:68px; width:min(920px,96vw); z-index:2147483647;
      background:#101114ee; border-radius:12px; box-shadow:0 8px 28px rgba(0,0,0,.35);
      backdrop-filter:blur(4px); padding:10px; box-sizing:border-box; display:none;
      font:600 16px system-ui, sans-serif; color:#f2f3f7; user-select:none;
    }
    .rows{ display:flex; flex-direction:column; gap:6px; }
    .row{ display:flex; gap:6px; }
    .key{
      flex:1 0 auto; min-width:34px; height:46px; border-radius:8px; border:1px solid #2a2d36;
      background:#1b1d23; color:#f2f3f7; text-align:center; line-height:46px; cursor:pointer;
      user-select:none;
    }
    .key:active{ transform:translateY(1px); background:#232733; }
    .wide{ flex-basis:120px; }
    .space{ flex:3 0 220px; }
    .enter{ flex-basis:140px; background:#2758ff; border-color:#2758ff; }
    .mod{ background:#232733; }
    .shift-on{ outline:2px solid #5a7bff; }
  `;

  const inOSK = (evt) => {
    const p = (evt && typeof evt.composedPath === 'function') ? evt.composedPath() : [];
    return p && host ? p.includes(host) : false;
  };
  const refocusTarget = () => {
    if (target && typeof target.focus === 'function') {
      try { target.focus({preventScroll:true}); } catch {}
    }
  };

  function attachShadowUI(){
    if (host) return;
    host = document.createElement('div');
    host.style.cssText = "all:initial; position:fixed; z-index:2147483647; inset:0; pointer-events:none;";
    document.documentElement.appendChild(host);
    root = host.attachShadow({mode:'open'});

    const style = document.createElement('style'); style.textContent = styleCSS;

    fab = document.createElement('div');
    fab.className = 'fab'; fab.textContent = '⌨'; fab.style.pointerEvents = 'auto';
    fab.title = 'Toggle keyboard';
    fab.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); refocusTarget(); });
    fab.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); visible ? hide() : show(document.activeElement); });

    kb = document.createElement('div'); kb.className = 'wrap'; kb.style.pointerEvents = 'auto';
    kb.appendChild(buildBoard());

    root.append(style, fab, kb);
  }

  function currentRows(){ return mode === 'alpha' ? ROWS_ALPHA : ROWS_SYMBOLS; }

  function buildBoard(){
    const container = document.createElement('div');
    container.className = 'rows';
    for (const row of currentRows()){
      const r = document.createElement('div'); r.className='row';
      for (const tok of row){
        if (tok === '{SHIFT}') { r.appendChild(key('Shift','mod wide','shift')); continue; }
        if (tok === '{BKSP}')  { r.appendChild(key('⌫','mod wide','bksp')); continue; }
        if (tok === '{SPACE}') { r.appendChild(key('Space','space','space')); continue; }
        if (tok === '{ENTER}') { r.appendChild(key('Enter','enter','enter')); continue; }
        if (tok === '{CLOSE}') { r.appendChild(key('Close','mod wide','close')); continue; }
        if (tok === '{SYM}')   { r.appendChild(key('SYM','mod wide','sym')); continue; }
        if (tok === '{ABC}')   { r.appendChild(key('ABC','mod wide','abc')); continue; }
        r.appendChild(key(tokenLabel(tok),'', tok));
      }
      container.appendChild(r);
    }
    return container;
  }

  function tokenLabel(tok){
    if (!tok) return '';
    if (mode === 'symbols') return tok;          // symbols show as-is
    // alpha mode
    if (/^[a-z]$/.test(tok)) return shift ? tok.toUpperCase() : tok;
    if (shift && SHIFT_MAP[tok]) return SHIFT_MAP[tok];
    return tok;
  }

  function refreshLabels(){
    if (!kb) return;
    // rebuild the board when mode changes; otherwise just update labels
    const rowsWrap = kb.querySelector('.rows');
    const newWrap = buildBoard();
    kb.replaceChild(newWrap, rowsWrap);
    // highlight shift if in alpha mode
    const shiftKey = kb.querySelector('[data-role="shift"]');
    if (shiftKey) shiftKey.classList.toggle('shift-on', shift);
  }

  function key(label, cls='', roleOrTok=''){
    const b = document.createElement('div');
    b.className = `key ${cls}`.trim();
    b.textContent = label;
    b.setAttribute('tabindex','-1'); // don't steal focus
    if (roleOrTok && roleOrTok.startsWith('{')) {
      b.setAttribute('data-role', roleOrTok.replace(/[{}]/g,'').toLowerCase());
    } else if (roleOrTok) {
      b.setAttribute('data-tok', roleOrTok);
    }
    b.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); refocusTarget(); });
    b.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      press(b.getAttribute('data-role') || b.getAttribute('data-tok') || label);
      refocusTarget();
    });
    return b;
  }

  function isEditable(el){
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = (el.tagName||'').toLowerCase();
    if (tag === 'textarea') return true;
    if (tag === 'input') {
      const t = (el.type||'').toLowerCase();
      return !t || ['text','search','email','url','password','number','tel'].includes(t);
    }
    return false;
  }

  function show(el){
    attachShadowUI();
    target = isEditable(el) ? el : (isEditable(document.activeElement) ? document.activeElement : null);
    kb.style.display = 'block';
    visible = true;
    refreshLabels();
    refocusTarget();
  }
  function hide(){ if (!kb) return; kb.style.display = 'none'; visible = false; }

  function insertText(txt){
    if (!target) return;
    if (target.isContentEditable){
      document.execCommand('insertText', false, txt);
    } else if ('value' in target){
      const s = target.selectionStart ?? target.value.length;
      const e = target.selectionEnd ?? s;
      const before = target.value.slice(0,s), after = target.value.slice(e);
      target.value = before + txt + after;
      const pos = before.length + txt.length;
      try { target.setSelectionRange(pos,pos); } catch {}
      target.dispatchEvent(new Event('input', {bubbles:true}));
    }
    refocusTarget();
  }

  function backspace(){
    if (!target) return;
    if (target.isContentEditable){
      document.execCommand('delete', false);
    } else if ('value' in target){
      const s = target.selectionStart ?? target.value.length;
      const e = target.selectionEnd ?? s;
      if (s !== e){
        const before = target.value.slice(0,s), after = target.value.slice(e);
        target.value = before + after;
        try { target.setSelectionRange(before.length,before.length); } catch {}
      } else if (s > 0){
        const before = target.value.slice(0,s-1), after = target.value.slice(e);
        target.value = before + after;
        try { target.setSelectionRange(before.length,before.length); } catch {}
      }
      target.dispatchEvent(new Event('input', {bubbles:true}));
    }
    refocusTarget();
  }

  function press(roleOrTok){
    // Roles
    if (roleOrTok === 'shift'){
      if (mode === 'alpha') { shift = !shift; refreshLabels(); }
      return;
    }
    if (roleOrTok === 'bksp'){ backspace(); return; }
    if (roleOrTok === 'space'){ insertText(' '); return; }
    if (roleOrTok === 'enter'){
      if (target){
        target.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
        target.dispatchEvent(new KeyboardEvent('keyup',   {key:'Enter', bubbles:true}));
      }
      return;
    }
    if (roleOrTok === 'close'){ hide(); return; }
    if (roleOrTok === 'sym'){ mode='symbols'; shift=false; refreshLabels(); return; }
    if (roleOrTok === 'abc'){ mode='alpha'; refreshLabels(); return; }

    // Regular token
    let ch = roleOrTok || '';
    if (mode === 'alpha'){
      if (/^[a-z]$/.test(ch)) ch = shift ? ch.toUpperCase() : ch.toLowerCase();
      else if (shift && SHIFT_MAP[ch]) ch = SHIFT_MAP[ch];
      insertText(ch);
      if (shift && (/^[a-z]$/.test(roleOrTok) || SHIFT_MAP[roleOrTok])) {
        shift = false; refreshLabels(); // one-shot shift
      }
    } else {
      insertText(ch); // symbols mode: type as-is
    }
  }

  // Auto behaviour: show on focus, hide when nothing editable is focused
  document.addEventListener('focusin', (e) => { if (isEditable(e.target)){ target=e.target; show(target); } }, true);
  document.addEventListener('focusout', (e) => {
    if (inOSK(e)) return;
    setTimeout(() => {
      const a = document.activeElement;
      if (isEditable(a)) target = a; else hide();
    }, 0);
  }, true);
  document.addEventListener('mousedown', (e) => {
    if (inOSK(e)) { e.preventDefault(); e.stopPropagation(); refocusTarget(); }
  }, true);

  attachShadowUI(); // ensure ⌨ shows immediately
})();
