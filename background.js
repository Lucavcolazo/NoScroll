// NoScroll — service worker
// Vigila las pestañas y cierra las que coinciden con la lista de sitios prohibidos.

const DEFAULTS = {
  enabled: false,
  sites: [
    "instagram.com",
    "tiktok.com",
    "x.com",
    "twitter.com",
    "facebook.com",
    "reddit.com"
  ],
  closedCount: 0
};

const POUNCE_DELAY_MS = 2950; // aparece, mira, salta, lanza el cursor, clickea la X… y recién ahí se cierra
const pending = new Set();     // pestañas que ya se están por cerrar

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getState() {
  return chrome.storage.local.get(DEFAULTS);
}

// "https://www.instagram.com/reels" -> "instagram.com"
function normalize(entry) {
  return String(entry)
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
}

function isBlocked(url, sites) {
  if (!url) return false;
  let host;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    host = u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  return sites.some((raw) => {
    const s = normalize(raw);
    if (!s) return false;
    // Con punto: dominio exacto o subdominio (m.facebook.com, web.whatsapp.com…)
    if (s.includes(".")) return host === s || host.endsWith("." + s);
    // Sin punto ("tiktok"): cualquier host que lo contenga
    return host.includes(s);
  });
}

async function updateBadge(enabled) {
  await chrome.action.setBadgeText({ text: enabled ? "ON" : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#16161A" });
  await chrome.action.setTitle({
    title: enabled ? "NoScroll — vigilando 👀" : "NoScroll — durmiendo 💤"
  });
}

async function bumpCounter() {
  const { closedCount } = await getState();
  await chrome.storage.local.set({ closedCount: closedCount + 1 });
}

// Se inyecta en la página: la bolita aparece, te mira, mira la X, se aplasta,
// salta y lanza un cursor que vuela hasta la X y hace click.
// Tiene que ser autocontenida (no puede usar nada de afuera de la función).
function guardianAttack() {
  if (document.getElementById("__noscroll-guardian")) return;

  const phrases = [
    "Nop. A estudiar.",
    "Esto no, eh.",
    "Te estoy viendo…",
    "¿Otra vez?",
    "Cerrado. De nada.",
    "Volvé a lo tuyo."
  ];
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];

  // Tiempos (ms desde que aparece)
  const T = { closeBtn: 450, lookX: 520, blink: 640, jump: 800, throw: 960, flight: 980, click: 1940, happy: 2040, bye: 2250, end: 3200 };

  const W = window.innerWidth;
  const H = window.innerHeight;
  const SIZE = 140, RIGHT = 48, BOTTOM = 44;
  const BTN = 40, BTN_MARGIN = 16;
  const xCenter = { x: W - BTN_MARGIN - BTN / 2, y: BTN_MARGIN + BTN / 2 };

  const host = document.createElement("div");
  host.id = "__noscroll-guardian";
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  const root = host.attachShadow({ mode: "open" });

  // Hoja de estilos construible: no la bloquea el CSP de sitios como Instagram
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
    * { box-sizing: border-box; }
    .dim { position:fixed; inset:0; background:rgba(10,10,14,.32);
           animation: fade .25s ease-out both; transition: background .45s ease-in; }
    .dim.bye { background:rgba(10,10,14,.85); }

    .mascot { position:fixed; right:${RIGHT}px; bottom:${BOTTOM}px; width:${SIZE}px; height:${SIZE}px; }
    .body { width:100%; height:100%; transform-origin: 50% 100%; }
    .body svg { display:block; width:100%; height:100%; overflow:visible; }
    .eyes-inner { transform-box: fill-box; transform-origin: 50% 50%; }
    .shadow { position:fixed; right:${RIGHT + SIZE * 0.15}px; bottom:${BOTTOM - 10}px;
              width:${SIZE * 0.7}px; height:${SIZE * 0.12}px; border-radius:50%;
              background: radial-gradient(closest-side, rgba(0,0,0,.45), rgba(0,0,0,0));
              animation: fade .4s ease-out .2s both; }

    .bubble { position:fixed; right:${RIGHT + SIZE + 16}px; bottom:${BOTTOM + SIZE * 0.62}px; max-width:240px;
              background:#fff; color:#111114; padding:11px 15px; border-radius:14px;
              font:600 17px/1.3 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
              letter-spacing:-.01em; box-shadow:0 10px 30px rgba(0,0,0,.22);
              animation: pop .3s cubic-bezier(.2,1.5,.4,1) .35s both; }
    .bubble::after { content:""; position:absolute; right:-9px; bottom:16px;
              border:9px solid transparent; border-left-color:#fff; border-right:0; }

    .close { position:fixed; top:${BTN_MARGIN}px; right:${BTN_MARGIN}px;
             width:${BTN}px; height:${BTN}px; border-radius:50%;
             background:#fff; box-shadow:0 4px 16px rgba(0,0,0,.3);
             display:grid; place-items:center; opacity:0; transform:scale(.4);
             transition: transform .25s cubic-bezier(.2,1.6,.4,1), opacity .2s, background .1s; }
    .close.show { opacity:1; transform:scale(1); }
    .close.pressed { background:#E5484D; transform:scale(.86); }
    .close svg { width:16px; height:16px; stroke:#111114; transition: stroke .1s; }
    .close.pressed svg { stroke:#fff; }

    .ripple { position:fixed; left:${xCenter.x - 20}px; top:${xCenter.y - 20}px;
              width:40px; height:40px; border-radius:50%; border:3px solid #E5484D; opacity:0; }

    .cursor { position:fixed; left:0; top:0; width:24px; opacity:0;
              transform-origin: 0 0; will-change: transform;
              filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
    .cursor svg { display:block; width:100%; transform-origin: 0 0; }

    @keyframes fade { from { opacity:0 } }
    @keyframes pop  { from { transform:scale(.4); opacity:0 } }
  `);
  root.adoptedStyleSheets = [sheet];

  root.innerHTML = `
    <div class="dim"></div>
    <div class="close">
      <svg viewBox="0 0 16 16" fill="none" stroke-width="2.6" stroke-linecap="round"><path d="M3 3 L13 13 M13 3 L3 13"/></svg>
    </div>
    <div class="ripple"></div>
    <div class="bubble">${phrase}</div>
    <div class="shadow"></div>
    <div class="mascot">
      <div class="body">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="ns-body" cx="38%" cy="30%" r="78%">
              <stop offset="0" stop-color="#ffffff"/>
              <stop offset=".42" stop-color="#f1f2f5"/>
              <stop offset=".78" stop-color="#cdd1da"/>
              <stop offset="1" stop-color="#9ea4b1"/>
            </radialGradient>
            <radialGradient id="ns-ao" cx="50%" cy="100%" r="62%">
              <stop offset="0" stop-color="#4a5060" stop-opacity=".32"/>
              <stop offset="1" stop-color="#4a5060" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="ns-shine" cx="50%" cy="50%" r="50%">
              <stop offset="0" stop-color="#fff" stop-opacity=".95"/>
              <stop offset="1" stop-color="#fff" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="92" fill="url(#ns-body)"/>
          <circle cx="100" cy="100" r="92" fill="url(#ns-ao)"/>
          <ellipse cx="66" cy="50" rx="36" ry="20" transform="rotate(-30 66 50)" fill="url(#ns-shine)"/>
          <g class="eyes">
            <g class="eyes-inner">
              <rect x="70" y="72" width="20" height="50" rx="10" transform="rotate(8 80 97)" fill="#121216"/>
              <rect x="110" y="72" width="20" height="50" rx="10" transform="rotate(-8 120 97)" fill="#121216"/>
              <ellipse cx="81" cy="82" rx="4" ry="6" transform="rotate(8 80 97)" fill="#fff" opacity=".55"/>
              <ellipse cx="121" cy="82" rx="4" ry="6" transform="rotate(-8 120 97)" fill="#fff" opacity=".55"/>
            </g>
          </g>
        </svg>
      </div>
    </div>
    <div class="cursor">
      <svg viewBox="0 0 20 28" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1 L1 21.5 L6.2 16.6 L9.6 25 L13 23.6 L9.7 15.4 L16.8 15.4 Z"
              fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/>
      </svg>
    </div>
  `;
  (document.body || document.documentElement).appendChild(host);

  const $ = (sel) => root.querySelector(sel);
  const at = (ms, fn) => setTimeout(fn, ms);
  const mascot = $(".mascot"), body = $(".body"), eyes = $(".eyes"), eyesInner = $(".eyes-inner");
  const cursor = $(".cursor"), shadow = $(".shadow");

  // --- Ojos que miran ---------------------------------------------------
  // Primero miran tu mouse, después la X, después el cursor en vuelo.
  let pointer = { x: W / 2, y: H / 2 };
  const onMove = (e) => { pointer = { x: e.clientX, y: e.clientY }; };
  window.addEventListener("mousemove", onMove, { passive: true });

  const cursorTip = () => {
    const r = cursor.getBoundingClientRect();
    const m = new DOMMatrixReadOnly(getComputedStyle(cursor).transform);
    return { x: m.e, y: m.f, valid: r.width > 0 };
  };
  let target = () => pointer;
  let eye = { x: 0, y: 0 };
  const t0 = performance.now();

  (function track() {
    const r = mascot.getBoundingClientRect();
    const c = { x: r.left + r.width / 2, y: r.top + r.height * 0.48 };
    const p = target();
    const dx = p.x - c.x, dy = p.y - c.y;
    const len = Math.hypot(dx, dy) || 1;
    const reach = Math.min(len / 180, 1);
    const want = { x: (dx / len) * 26 * reach, y: (dy / len) * 20 * reach };
    eye.x += (want.x - eye.x) * 0.22;
    eye.y += (want.y - eye.y) * 0.22;
    eyes.setAttribute("transform", `translate(${eye.x.toFixed(2)} ${eye.y.toFixed(2)})`);
    if (performance.now() - t0 < T.end) requestAnimationFrame(track);
    else window.removeEventListener("mousemove", onMove);
  })();

  // --- Coreografía ------------------------------------------------------
  // Entra rebotando desde abajo
  mascot.animate(
    [{ transform: `translateY(${SIZE + BOTTOM + 40}px)` }, { transform: "translateY(0)" }],
    { duration: 520, easing: "cubic-bezier(.2,1.35,.45,1)", fill: "backwards" }
  );
  body.animate(
    [{ transform: "scale(.92,1.1)" }, { transform: "scale(1.08,.92)", offset: .7 }, { transform: "scale(1,1)" }],
    { duration: 520, easing: "ease-out" }
  );

  at(T.closeBtn, () => $(".close").classList.add("show"));
  at(T.lookX, () => { target = () => xCenter; });

  at(T.blink, () => eyesInner.animate(
    [{ transform: "scaleY(1)" }, { transform: "scaleY(.08)" }, { transform: "scaleY(1)" }],
    { duration: 170, easing: "ease-in-out" }
  ));

  // Se aplasta (carga), se estira y salta: el cursor sale disparado
  at(T.jump, () => {
    body.animate([
      { transform: "translateY(0) scale(1,1)" },
      { transform: "translateY(4px) scale(1.16,.8)", offset: .28 },
      { transform: "translateY(-34px) scale(.9,1.12)", offset: .52 },
      { transform: "translateY(0) scale(1.08,.92)", offset: .8 },
      { transform: "translateY(0) scale(1,1)" }
    ], { duration: 560, easing: "ease-in-out" });
    shadow.animate([
      { transform: "scale(1)", opacity: 1 },
      { transform: "scale(1.12)", opacity: 1, offset: .28 },
      { transform: "scale(.7)", opacity: .5, offset: .52 },
      { transform: "scale(1)", opacity: 1 }
    ], { duration: 560, easing: "ease-in-out" });
  });

  at(T.throw, () => {
    const r = mascot.getBoundingClientRect();
    const start = { x: r.left + r.width * 0.5, y: r.top + r.height * 0.05 };
    const end = xCenter;
    const ctrl = { x: Math.min(start.x, end.x) - Math.min(280, W * 0.28), y: Math.max(30, H * 0.1) };
    const frames = [];
    const N = 28;
    for (let i = 0; i <= N; i++) {
      const t = i / N, u = 1 - t;
      const x = u * u * start.x + 2 * u * t * ctrl.x + t * t * end.x;
      const y = u * u * start.y + 2 * u * t * ctrl.y + t * t * end.y;
      frames.push({ offset: t, transform: `translate(${x}px, ${y}px) rotate(${t * 360}deg) scale(${0.45 + 0.55 * t})` });
    }
    cursor.style.opacity = "1";
    cursor.animate(frames, { duration: T.flight, easing: "cubic-bezier(.3,.55,.35,1)", fill: "forwards" });
    target = () => { const p = cursorTip(); return p.valid ? p : xCenter; };
  });

  // Click en la X
  at(T.click, () => {
    target = () => xCenter;
    $(".cursor svg").animate(
      [{ transform: "scale(1)" }, { transform: "scale(.78)" }, { transform: "scale(1)" }],
      { duration: 220, easing: "ease-out" }
    );
    $(".close").classList.add("pressed");
    $(".ripple").animate(
      [{ transform: "scale(.5)", opacity: 1 }, { transform: "scale(2.6)", opacity: 0 }],
      { duration: 500, easing: "ease-out", fill: "forwards" }
    );
  });

  // Satisfecha: entrecierra los ojos y hace un saltito
  at(T.happy, () => {
    eyesInner.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(.38)" }],
      { duration: 160, easing: "ease-out", fill: "forwards" });
    body.animate([
      { transform: "translateY(0) scale(1,1)" },
      { transform: "translateY(-12px) scale(.96,1.05)", offset: .4 },
      { transform: "translateY(0) scale(1.04,.96)", offset: .75 },
      { transform: "translateY(0) scale(1,1)" }
    ], { duration: 360, easing: "ease-out" });
  });

  at(T.bye, () => {
    $(".dim").classList.add("bye");
    $(".bubble").textContent = "Chau 👋";
  });
}

async function pounce(tab) {
  if (pending.has(tab.id)) return;
  pending.add(tab.id);
  try {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: guardianAttack });
      await sleep(POUNCE_DELAY_MS);
    } catch {
      // Página que no deja inyectar (o todavía cargando): se cierra igual.
    }

    // Re-chequear: quizás lo apagaste o saliste del sitio en el medio.
    const { enabled, sites } = await getState();
    if (!enabled) return;
    let current;
    try {
      current = await chrome.tabs.get(tab.id);
    } catch {
      return; // ya no existe
    }
    if (!isBlocked(current.url || current.pendingUrl, sites)) return;

    // Si es la única pestaña de la ventana, abrimos una nueva para no cerrar la ventana.
    const siblings = await chrome.tabs.query({ windowId: current.windowId });
    if (siblings.length === 1) await chrome.tabs.create({ windowId: current.windowId });

    await chrome.tabs.remove(tab.id);
    await bumpCounter();
  } finally {
    pending.delete(tab.id);
  }
}

async function check(tab) {
  const { enabled, sites } = await getState();
  if (enabled && isBlocked(tab.url || tab.pendingUrl, sites)) pounce(tab);
}

async function sweep() {
  const { enabled, sites } = await getState();
  if (!enabled) return;
  const tabs = await chrome.tabs.query({});
  tabs
    .filter((t) => isBlocked(t.url || t.pendingUrl, sites))
    .forEach((t, i) => setTimeout(() => pounce(t), i * 450));
}

// --- Eventos ---

chrome.runtime.onInstalled.addListener(async () => {
  const saved = await chrome.storage.local.get(null);
  const state = { ...DEFAULTS, ...saved };
  await chrome.storage.local.set(state);
  await updateBadge(state.enabled);
});

chrome.runtime.onStartup.addListener(async () => {
  const { enabled } = await getState();
  await updateBadge(enabled);
  sweep();
});

// Navegación nueva o cambio de URL (incluye apps tipo SPA, ej. youtube.com/shorts)
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.url || info.status === "loading") check(tab);
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local") return;
  if (changes.enabled) await updateBadge(changes.enabled.newValue);
  if (changes.enabled?.newValue === true || changes.sites) sweep();
});
