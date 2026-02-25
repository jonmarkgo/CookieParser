const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444"];
const MAX_RECIPES = 4;

let recipes = [];
let appUrl = "https://baking-app.exe.xyz";

// Render immediately with defaults so popup isn't blank
render();

// Then hydrate from storage
chrome.storage.local.get(["recipes", "appUrl"], (data) => {
  recipes = data.recipes || [];
  appUrl = data.appUrl || "https://baking-app.exe.xyz";
  document.getElementById("app-url").value = appUrl;
  render();
});

// Add current tab's URL
document.getElementById("add-btn").addEventListener("click", async () => {
  if (recipes.length >= MAX_RECIPES) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  // Don't add duplicates
  if (recipes.includes(tab.url)) return;

  recipes.push(tab.url);
  save();
  render();
});

// Compare — open app with URLs as params, then clear queue
document.getElementById("compare-btn").addEventListener("click", () => {
  if (recipes.length < 2) return;
  const params = recipes.map((u) => `r=${encodeURIComponent(u)}`).join("&");
  const url = `${appUrl}?${params}&auto=1`;
  chrome.tabs.create({ url });
  recipes = [];
  save();
  render();
});

// Clear all
document.getElementById("clear-btn").addEventListener("click", () => {
  recipes = [];
  save();
  render();
});

// Save app URL on change
document.getElementById("app-url").addEventListener("change", (e) => {
  appUrl = e.target.value.trim().replace(/\/+$/, "");
  chrome.storage.local.set({ appUrl });
});

function save() {
  chrome.storage.local.set({ recipes });
}

function render() {
  const list = document.getElementById("list");
  const empty = document.getElementById("empty");
  const addBtn = document.getElementById("add-btn");
  const compareBtn = document.getElementById("compare-btn");
  const clearBtn = document.getElementById("clear-btn");
  const count = document.getElementById("count");

  list.innerHTML = "";

  if (recipes.length === 0) {
    empty.style.display = "block";
    clearBtn.style.display = "none";
    count.textContent = "No recipes queued";
  } else {
    empty.style.display = "none";
    clearBtn.style.display = "block";
    count.textContent = `${recipes.length} recipe${recipes.length > 1 ? "s" : ""} queued`;

    recipes.forEach((url, i) => {
      const li = document.createElement("li");
      let hostname = url;
      try { hostname = new URL(url).hostname.replace(/^www\./, ""); } catch {}

      li.innerHTML = `
        <span class="num" style="background:${COLORS[i]}">${i + 1}</span>
        <span class="url" title="${escHtml(url)}">${escHtml(hostname)}</span>
        <button class="remove" data-index="${i}">&times;</button>
      `;
      list.appendChild(li);
    });

    // Remove handlers
    list.querySelectorAll(".remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        recipes.splice(parseInt(btn.dataset.index), 1);
        save();
        render();
      });
    });
  }

  addBtn.disabled = recipes.length >= MAX_RECIPES;
  compareBtn.disabled = recipes.length < 2;
}

function escHtml(str) {
  const d = document.createElement("span");
  d.textContent = str;
  return d.innerHTML;
}
