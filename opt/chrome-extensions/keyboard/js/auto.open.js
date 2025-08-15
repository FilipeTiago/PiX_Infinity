(() => {
  // ======= Config =======
  const KB_WIDTH = 920;      // px (max)
  const KB_HEIGHT = 260;     // px
  const MARGIN = 8;          // px from bottom
  const ROWS = [
    "1234567890",
    "qwertyuiop",
    "asdfghjkl",
    "{SHIFT}zxcvbnm{BKSP}",
    "{SPACE}{ENTER}{CLOSE}"
  ];
  // ======================

  let wrapper, board, shift = false, target = null, visible = false;

  const css = `
    .osk-wrap {
      position: fixed; left: 50%; transform: translateX(-50%);
      bottom: ${MARGIN}px; width: min(${KB_WIDTH}px, 96vw); height: ${KB_HEIGHT}px;
      z-index: 2147483647; display:none; box-shadow: 0 8px 28px rgba(0,0,0,.35);
      border-radius: 12px; background:#101114ee; backdrop-filter: blur(4px);
      padding: 10px; box-sizing: border-box; user-select: none;
    }
    .osk-row { display: flex; gap: 6px; margin: 6px 0; }
    .osk-key {
      flex: 1 0 auto; min-width: 34px; height: 46px; border-radius: 8px;
      background:#1b1d23; color:#f2f3f7; font: 600 16px/46px system-ui, sans-serif;
      text-align:center; cursor: pointer; border: 1px solid #2a2d36;
      outline: none;
    }
    .osk-key:active { transform: translateY(1px); background:#232733; }
    .osk-key.wide { flex-basis: 120px; }
    .osk-key.space { flex: 3 0 220px; }
    .osk-key.enter { flex-basis: 120px; background:#2758ff; border-color:#2758ff; }
    .osk-key.mod { background:#232733; }
    .osk-header {
      display:flex; justify-content: flex-end; margin-bottom: 6px;
    }
    .osk-close {
      width: 28px; height: 28px; border-radius: 6px; background:#232733;
      border:1px solid #2a2d36; color:#eee; cursor:pointer; line-height:28px; text-align:center;
    }
  `;

  function injectCSS() {
    if (document.getElementById("__osk_style")) return;
    const style = document.createElement("style");
    style.id = "__osk_style";
    style.textContent = css;
    document.documentElement.appendChild(style);
  }

  function makeKey(label, className = "") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `osk-key ${className}`;
    btn.textContent = label;
    btn.addEventListener("click", () => press(label));
    return btn;
  }

  function buildUI() {
    if (wrapper) return;
    injectCSS();

    wrapper = document.createElement("div");
    wrapper.className = "osk-wrap";
    wrapper.setAttribute("role","dialog");
    wrapper.setAttribute("aria-label","On-screen keyboard");

    const header = document.createElement("div");
    header.className = "osk-header";
    const close = document.createElement("button");
    close.className = "osk-close";
    close.textContent = "×";
    close.title = "Close";
    close.addEventListener("click", hide);
    header.appendChild(close);

    board = document.createElement("div");
    for (const row of ROWS) {
      const r = document.createElement("div");
      r.className = "osk-row";
      let token = "";
      for (let i = 0; i < row.length; i++) {
        token += row[i];
        if (token === "{SHIFT}") { r.appendChild(makeKey("Shift","mod wide")); token = ""; i += 6; continue; }
        if (token === "{BKSP}")  { r.appendChild(makeKey("⌫","mod wide")); token = ""; i += 5; continue; }
        if (token === "{SPACE}") { r.appendChild(makeKey("Space","space")); token = ""; i += 6; continue; }
        if (token === "{ENTER}") { r.appendChild(makeKey("Enter","enter")); token = ""; i += 6; continue; }
        if (token === "{CLOSE}") { r.appendChild(makeKey("Close","mod wide")); token = ""; i += 6; continue; }
        // Normal char
        if (i === row.length - 1 || row[i+1] === "{" || row[i+1] === undefined) {
          r.appendChild(makeKey(token));
          token = "";
        }
      }
      board.appendChild(r);
    }

    wrapper.appendChild(header);
    wrapper.appendChild(board);
    document.documentElement.appendChild(wrapper);
  }

  function isEditable(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    if (!el.tagName) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === "textarea") return true;
    if (tag === "input") {
      const t = (el.type || "").toLowerCase();
      return !t || ["text","search","email","url","password","number","tel"].includes(t);
    }
    return false;
  }

  function show(el) {
    buildUI();
    target = el;
    wrapper.style.display = "block";
    visible = true;
  }
  function hide() { if (!wrapper) return; wrapper.style.display = "none"; visible = false; }

  function insertText(txt) {
    if (!target) return;
    if (target.isContentEditable) {
      document.execCommand("insertText", false, txt);
      return;
    }
    if ("value" in target) {
      const s = target.selectionStart ?? target.value.length;
      const e = target.selectionEnd ?? s;
      const before = target.value.slice(0, s);
      const after  = target.value.slice(e);
      target.value = before + txt + after;
      const pos = before.length + txt.length;
      try { target.setSelectionRange(pos, pos); } catch {}
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function backspace() {
    if (!target) return;
    if (target.isContentEditable) {
      document.execCommand("delete", false);
      return;
    }
    if ("value" in target) {
      const s = target.selectionStart ?? target.value.length;
      const e = target.selectionEnd ?? s;
      if (s !== e) {
        const before = target.value.slice(0, s);
        const after  = target.value.slice(e);
        target.value = before + after;
        try { target.setSelectionRange(before.length, before.length); } catch {}
      } else if (s > 0) {
        const before = target.value.slice(0, s - 1);
        const after  = target.value.slice(e);
        target.value = before + after;
        try { target.setSelectionRange(before.length, before.length); } catch {}
      }
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function press(label) {
    if (label === "Shift") { shift = !shift; return; }
    if (label === "⌫")     { backspace(); return; }
    if (label === "Space") { insertText(" "); return; }
    if (label === "Enter") {
      if (target) target.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      if (target) target.dispatchEvent(new KeyboardEvent("keyup",   { key: "Enter", bubbles: true }));
      return;
    }
    if (label === "Close") { hide(); return; }

    const ch = shift ? label.toUpperCase() : label.toLowerCase();
    insertText(ch);
    if (shift && ch.length === 1 && /[a-z]/i.test(ch)) shift = false; // one-shot shift
  }

  // Auto show/hide on focus
  document.addEventListener("focusin", (e) => {
    if (isEditable(e.target)) show(e.target);
  }, true);

  document.addEventListener("focusout", () => {
    setTimeout(() => {
      const a = document.activeElement;
      if (isEditable(a)) { target = a; } else { hide(); }
    }, 0);
  }, true);

  // ESC hides
  document.addEventListener("keydown", (e) => { if (visible && e.key === "Escape") hide(); }, true);
})();
