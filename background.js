// Gatito Guardián — service worker
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

const POUNCE_DELAY_MS = 1700; // lo que dura la animación del gato antes de cerrar
const pending = new Set();     // pestañas que el gato ya está por cerrar

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
  await chrome.action.setBadgeBackgroundColor({ color: "#E8833A" });
  await chrome.action.setTitle({
    title: enabled ? "Gatito Guardián — vigilando 👀" : "Gatito Guardián — durmiendo 💤"
  });
}

async function bumpCounter() {
  const { closedCount } = await getState();
  await chrome.storage.local.set({ closedCount: closedCount + 1 });
}

// Se inyecta en la página: el gato aparece, te reta y manotea la pestaña.
function catAttack() {
  if (document.getElementById("__gatito-guardian")) return;

  const phrases = [
    "¡Fuera de acá! 🐾",
    "Nop. A estudiar.",
    "Miau. Cerrado.",
    "¿Otra vez? 😾",
    "Esto no es productivo, humano.",
    "Te estoy viendo…"
  ];
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];

  const host = document.createElement("div");
  host.id = "__gatito-guardian";
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  const root = host.attachShadow({ mode: "open" });

  root.innerHTML = `
    <style>
      .dim { position:fixed; inset:0; background:rgba(20,14,10,.35);
             animation: fade .25s ease-out both; }
      .cat { position:fixed; right:40px; bottom:-10px; width:220px;
             animation: rise .45s cubic-bezier(.2,1.4,.4,1) both; }
      .paw { transform-origin: 30px 120px;
             animation: swipe .35s ease-in-out .7s 3 alternate both; }
      .bubble { position:fixed; right:230px; bottom:170px; max-width:240px;
                background:#fff; color:#2b1d14; padding:12px 16px; border-radius:16px;
                font:600 18px/1.3 -apple-system, system-ui, sans-serif;
                box-shadow:0 8px 24px rgba(0,0,0,.25);
                animation: pop .3s cubic-bezier(.2,1.5,.4,1) .35s both; }
      .bubble::after { content:""; position:absolute; right:-10px; bottom:18px;
                border:10px solid transparent; border-left-color:#fff; border-right:0; }
      @keyframes fade { from { opacity:0 } }
      @keyframes rise { from { transform:translateY(110%) } }
      @keyframes pop  { from { transform:scale(.4); opacity:0 } }
      @keyframes swipe { from { transform:rotate(0) } to { transform:rotate(-38deg) } }
    </style>
    <div class="dim"></div>
    <div class="bubble">${phrase}</div>
    <svg class="cat" viewBox="0 0 160 170" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="80" cy="150" rx="58" ry="34" fill="#E8833A"/>
      <g class="paw">
        <rect x="14" y="62" width="26" height="70" rx="13" fill="#E8833A"/>
        <ellipse cx="27" cy="64" rx="16" ry="13" fill="#F6C9A0"/>
        <circle cx="20" cy="58" r="3.2" fill="#E79A9A"/>
        <circle cx="27" cy="55" r="3.2" fill="#E79A9A"/>
        <circle cx="34" cy="58" r="3.2" fill="#E79A9A"/>
      </g>
      <path d="M38 70 L46 22 L72 50 Z" fill="#E8833A"/>
      <path d="M122 70 L114 22 L88 50 Z" fill="#E8833A"/>
      <path d="M46 62 L50 34 L64 50 Z" fill="#F2A6A0"/>
      <path d="M114 62 L110 34 L96 50 Z" fill="#F2A6A0"/>
      <ellipse cx="80" cy="84" rx="50" ry="42" fill="#F0974A"/>
      <path d="M70 46 q2 10 0 18 M80 44 v20 M90 46 q-2 10 0 18" stroke="#C9692A" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M52 72 l18 6 M108 72 l-18 6" stroke="#2b1d14" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="62" cy="86" rx="8" ry="9" fill="#2b1d14"/>
      <ellipse cx="98" cy="86" rx="8" ry="9" fill="#2b1d14"/>
      <circle cx="65" cy="83" r="2.5" fill="#fff"/>
      <circle cx="101" cy="83" r="2.5" fill="#fff"/>
      <path d="M75 98 h10 l-5 6 Z" fill="#E77A8A"/>
      <path d="M80 104 q-6 8 -13 3 M80 104 q6 8 13 3" stroke="#2b1d14" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M40 96 h-22 M40 102 l-20 6 M120 96 h22 M120 102 l20 6" stroke="#2b1d14" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
  (document.body || document.documentElement).appendChild(host);
}

async function pounce(tab) {
  if (pending.has(tab.id)) return;
  pending.add(tab.id);
  try {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: catAttack });
      await sleep(POUNCE_DELAY_MS);
    } catch {
      // Página que no deja inyectar (o todavía cargando): se cierra igual.
    }

    // Re-chequear: quizás apagaste al gato o saliste del sitio en el medio.
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
