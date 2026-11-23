const $ = (id) => document.getElementById(id);

function normalize(entry) {
  return String(entry)
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
}

async function getState() {
  return chrome.storage.local.get({ enabled: false, sites: [], closedCount: 0 });
}

function render({ enabled, sites, closedCount }) {
  document.body.classList.toggle("on", enabled);
  $("status").textContent = enabled ? "Vigilando tus pestañas 👀" : "Durmiendo… zzz";
  $("toggle").textContent = enabled ? "Dormir al gatito" : "Despertar al gatito";
  $("count").textContent = closedCount;

  const list = $("site-list");
  list.replaceChildren();
  if (!sites.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No hay sitios. El gato se aburre.";
    list.append(li);
    return;
  }
  for (const site of sites) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = site;
    const btn = document.createElement("button");
    btn.className = "remove";
    btn.type = "button";
    btn.title = `Sacar ${site}`;
    btn.textContent = "×";
    btn.addEventListener("click", async () => {
      const state = await getState();
      await chrome.storage.local.set({ sites: state.sites.filter((s) => s !== site) });
    });
    li.append(name, btn);
    list.append(li);
  }
}

$("toggle").addEventListener("click", async () => {
  const { enabled } = await getState();
  await chrome.storage.local.set({ enabled: !enabled });
});

$("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const site = normalize($("site-input").value);
  if (!site) return;
  const { sites } = await getState();
  if (!sites.includes(site)) await chrome.storage.local.set({ sites: [...sites, site] });
  $("site-input").value = "";
});

chrome.storage.onChanged.addListener(async (_changes, area) => {
  if (area === "local") render(await getState());
});

getState().then(render);
