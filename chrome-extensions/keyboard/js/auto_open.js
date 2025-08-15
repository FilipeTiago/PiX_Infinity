(() => {
  const KB_WIDTH = 920, KB_HEIGHT = 260, MARGIN = 8;
  const ROWS = [
    "1234567890",
    "qwertyuiop",
    "asdfghjkl",
    "{SHIFT}zxcvbnm{BKSP}",
    "{SPACE}{ENTER}{CLOSE}"
  ];
  let wrap, board, shift=false, target=null, visible=false, fab;

  // Style helper that uses !important to beat hostile CSS
  const imp = (...pairs) => pairs.map(([k,v]) => `${k}:${v}!important`).join(';');

  function injectCSS() {
    if (document.getElementById('__osk_style')) return;
    const s = document.createElement('style');
    s.id='__osk_style';
    s.textContent = `
      .osk-wrap{${imp(['position','fixed'],['left','50%'],['transform','translateX(-50%)'],
                       ['bottom',MARGIN+'px'],['width',`min(${KB_WIDTH}px,96vw)`],
                       ['height',KB_HEIGHT+'px'],['z-index','2147483647'],
                       ['display','none'],['box-shadow','0 8px 28px rgba(0,0,0,.35)'],
                       ['border-radius','12px'],['background','#101114ee'],
                       ['backdrop-filter','blur(4px)'],['padding','10px'],
                       ['box-sizing','border-box'],['user-select','none'])}
      .osk-row{${imp(['display','flex'],['gap','6px'],['margin','6px 0'])}}
      .osk-key{${imp(['flex','1 0 auto'],['min-width','34px'],['height','46px'],
                      ['border-radius','8px'],['background','#1b1d23'],['color','#f2f3f7'],
                      ['font','600 16px/46px system-ui, sans-serif'],['text-align','center'],
                      ['cursor','pointer'],['border','1px solid #2a2d36'],['outline','none'])}}
      .osk-key:active{${imp(['transform','translateY(1px)'],['background','#232733'])}}
      .osk-key.wide{${imp(['flex-basis','120px'])}}
      .osk-key.space{${imp(['flex','3 0 220px'])}}
      .osk-key.enter{${imp(['flex-basis','120px'],['background','#2758ff'],['border-color','#2758ff'])}}
      .osk-key.mod{${imp(['background','#232733'])}}
      .osk-fab{${imp(['position','fixed'],['right','12px'],['bottom', (KB_HEIGHT+MARGIN+12)+'px'],
                     ['width','44px'],['height','44px'],['border-radius','50%'],
                     ['background','#2758ff'],['color','#fff'],['display','flex'],
                     ['align-items','center'],['justify-content','center'],
                     ['font','700 18px system-ui, sans-serif'],['z-index','2147483647'],
                     ['cursor','pointer'],['box-shadow','0 6px 20px rgba(0,0,0,.35)'])}}
    `;
    document.documentElement.appendChild(s);
  }

  function makeKey(label, cls=''){
    const b=document.createElement('button');
    b.type='button';
    b.className='osk-key '+cls;
    b.textContent=label;
    b.addEventListener('click',()=>press(label));
    return b;
  }

  function buildUI(){
    if (wrap) return;
    injectCSS();

    wrap=document.createElement('div'); wrap.className='osk-wrap';
    board=document.createElement('div');

    for(const row of ROWS){
      const r=document.createElement('div'); r.className='osk-row';
      let tok='';
      for(let i=0;i<row.length;i++){
        tok+=row[i];
        if(tok==='{SHIFT}') { r.appendChild(makeKey('Shift','mod wide')); tok=''; i+=6; continue; }
        if(tok==='{BKSP}')  { r.appendChild(makeKey('⌫','mod wide')); tok=''; i+=5; continue; }
        if(tok==='{SPACE}') { r.appendChild(makeKey('Space','space')); tok=''; i+=6; continue; }
        if(tok==='{ENTER}') { r.appendChild(makeKey('Enter','enter')); tok=''; i+=6; continue; }
        if(tok==='{CLOSE}') { r.appendChild(makeKey('Close','mod wide')); tok=''; i+=6; continue; }
        if(i===row.length-1 || row[i+1]==='{' || row[i+1]===undefined){
          r.appendChild(makeKey(tok)); tok='';
        }
      }
      board.appendChild(r);
    }
    wrap.appendChild(board);
    (document.body||document.documentElement).appendChild(wrap);

    if(!fab){
      fab=document.createElement('div');
      fab.className='osk-fab';
      fab.textContent='⌨';
      fab.title='Toggle keyboard';
      fab.addEventListener('click', ()=> visible ? hide() : show(target || document.activeElement));
      (document.body||document.documentElement).appendChild(fab);
    }
  }

  function isEditable(el){
    if(!el) return false;
    if(el.isContentEditable) return true;
    if(!el.tagName) return false;
    const tag=el.tagName.toLowerCase();
    if(tag==='textarea') return true;
    if(tag==='input'){
      const t=(el.type||'').toLowerCase();
      return !t || ['text','search','email','url','password','number','tel'].includes(t);
    }
    return false;
  }

  function show(el){ buildUI(); target=el||document.activeElement; wrap.style.display='block'; visible=true; }
  function hide(){ if(!wrap) return; wrap.style.display='none'; visible=false; }

  function insertText(txt){
    if(!target) return;
    if(target.isContentEditable){ document.execCommand('insertText', false, txt); return; }
    if('value' in target){
      const s=target.selectionStart ?? target.value.length;
      const e=target.selectionEnd ?? s;
      const before=target.value.slice(0,s), after=target.value.slice(e);
      target.value=before+txt+after;
      const pos=before.length+txt.length;
      try{ target.setSelectionRange(pos,pos); }catch{}
      target.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }

  function backspace(){
    if(!target) return;
    if(target.isContentEditable){ document.execCommand('delete', false); return; }
    if('value' in target){
      const s=target.selectionStart ?? target.value.length;
      const e=target.selectionEnd ?? s;
      if(s!==e){
        const before=target.value.slice(0,s), after=target.value.slice(e);
        target.value=before+after;
        try{ target.setSelectionRange(before.length,before.length); }catch{}
      } else if(s>0){
        const before=target.value.slice(0,s-1), after=target.value.slice(e);
        target.value=before+after;
        try{ target.setSelectionRange(before.length,before.length); }catch{}
      }
      target.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }

  function press(label){
    if(label==='Shift'){ shift=!shift; return; }
    if(label==='⌫'){ backspace(); return; }
    if(label==='Space'){ insertText(' '); return; }
    if(label==='Enter'){
      if(target){
        target.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
        target.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}));
      }
      return;
    }
    if(label==='Close'){ hide(); return; }
    const ch=shift ? label.toUpperCase() : label.toLowerCase();
    insertText(ch);
    if(shift && ch.length===1 && /[a-z]/i.test(ch)) shift=false;
  }

  // Auto show on focus; also keep track of current target
  document.addEventListener('focusin', e => {
    if(isEditable(e.target)){ target=e.target; show(target); }
  }, true);
  document.addEventListener('focusout', () => {
    setTimeout(()=>{ const a=document.activeElement; if(isEditable(a)) target=a; else hide(); }, 0);
  }, true);

  // Build immediately to ensure button exists
  buildUI();
})();
