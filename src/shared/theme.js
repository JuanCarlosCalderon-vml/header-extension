// Shared theme handling (light/dark) for the Header Tool popup.
// Exposed as globals so the plain (non-module) popup script can use them.

async function loadTheme() {
  const { theme } = await chrome.storage.local.get("theme");
  applyTheme(theme || "light");
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.body.setAttribute("data-theme", "dark");
  } else {
    document.body.removeAttribute("data-theme");
  }
}

async function toggleTheme() {
  const { theme } = await chrome.storage.local.get("theme");
  const next = theme === "dark" ? "light" : "dark";
  await chrome.storage.local.set({ theme: next });
  applyTheme(next);
}
