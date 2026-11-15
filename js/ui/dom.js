// Kleine DOM-Helfer: Elemente bauen, Hinweise, Dialoge.

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style' && typeof value === 'object') {
      for (const [prop, v] of Object.entries(value)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, v);
        else el.style[prop] = v;
      }
    }
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key in el && typeof value !== 'string') el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  add(el, children);
  return el;
}

export function add(el, ...children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function svg(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export function toast(text, ms = 2800) {
  document.querySelector('.toast')?.remove();
  const el = h('div', { class: 'toast', role: 'status' }, text);
  document.body.append(el);
  setTimeout(() => el.remove(), ms);
}

// Öffnet einen Dialog; resolve(value) mit dem Wert des gedrückten Knopfs, null bei Schließen.
export function dialog(content, actions = [{ label: 'OK', value: true, primary: true }]) {
  return new Promise((resolve) => {
    let done = false;
    const close = (value) => {
      if (done) return;
      done = true;
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    const buttons = actions.map((a) => h('button', {
      class: `btn ${a.primary ? 'btn-sun' : ''} ${a.danger ? 'btn-danger' : ''}`,
      onclick: () => close(a.value),
    }, a.label));
    const box = h('div', { class: 'card dialog', role: 'dialog', 'aria-modal': 'true' }, content, h('div', { class: 'actions' }, buttons));
    const overlay = h('div', { class: 'overlay', onclick: (e) => { if (e.target === overlay) close(null); } }, box);
    document.body.append(overlay);
    document.addEventListener('keydown', onKey);
    buttons.at(-1)?.focus({ preventScroll: true });
  });
}

export async function ask({ title, text, ok = 'OK', cancel = 'Abbrechen', danger = false }) {
  const value = await dialog(
    [h('h2', {}, title), text && h('p', {}, text)],
    [{ label: cancel, value: false }, { label: ok, value: true, primary: !danger, danger }],
  );
  return value === true;
}
