// Header Tool — popup logic
// Reads/writes header profiles to chrome.storage.local. The background service
// worker watches storage and rebuilds declarativeNetRequest rules from the
// active profile.

const state = {
  masterEnabled: true,
  profiles: [],
  activeProfileId: null,
  domains: []
};

const DEFAULT_DOMAINS = [];

// RFC 7230 token — valid HTTP header name characters.
const HEADER_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

// Header names/values that likely carry credentials — used to warn on export.
const SECRET_RE = /authorization|cookie|token|secret|password|api[-_]?key|bearer/i;

const els = {
  master: document.getElementById("masterToggle"),
  profileSelect: document.getElementById("profileSelect"),
  newBtn: document.getElementById("newBtn"),
  renameBtn: document.getElementById("renameBtn"),
  deleteBtn: document.getElementById("deleteBtn"),
  rows: document.getElementById("rows"),
  addBtn: document.getElementById("addBtn"),
  exportBtn: document.getElementById("exportBtn"),
  importBtn: document.getElementById("importBtn"),
  importFile: document.getElementById("importFile"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  scopeDot: document.getElementById("scopeDot"),
  scopeText: document.getElementById("scopeText"),
  domainsCount: document.getElementById("domainsCount"),
  domainList: document.getElementById("domainList"),
  domainInput: document.getElementById("domainInput"),
  domainAddForm: document.getElementById("domainAddForm"),
  addCurrentBtn: document.getElementById("addCurrentBtn"),
  toast: document.getElementById("toast")
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function isValidHeaderName(name) {
  return HEADER_NAME_RE.test(name);
}

let toastTimer;
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.add("hidden"), 1800);
}

function activeProfile() {
  return state.profiles.find((p) => p.id === state.activeProfileId) || null;
}

async function save() {
  await chrome.storage.local.set({
    masterEnabled: state.masterEnabled,
    profiles: state.profiles,
    activeProfileId: state.activeProfileId
  });
}

async function saveDomains() {
  await chrome.storage.local.set({ domains: state.domains });
}

// Drop any stored domain whose host permission is not actually granted. This
// happens when the permission prompt is dismissed/denied after the popup has
// already closed, leaving a domain saved but non-functional.
async function reconcileDomainPermissions() {
  if (!state.domains.length) return;
  const checks = await Promise.all(
    state.domains.map(async (domain) => {
      try {
        return await chrome.permissions.contains({ origins: originsFor(domain) });
      } catch (e) {
        return true; // don't remove on unexpected errors
      }
    })
  );
  const kept = state.domains.filter((_, i) => checks[i]);
  if (kept.length !== state.domains.length) {
    state.domains = kept;
    await saveDomains();
  }
}

function renderProfiles() {
  els.profileSelect.innerHTML = "";
  for (const p of state.profiles) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === state.activeProfileId) opt.selected = true;
    els.profileSelect.appendChild(opt);
  }
  els.deleteBtn.disabled = state.profiles.length <= 1;
}

function render() {
  els.master.checked = state.masterEnabled;
  renderProfiles();
  els.rows.innerHTML = "";

  const profile = activeProfile();
  if (!profile) return;

  if (!profile.headers.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No headers yet. Add one below.";
    els.rows.appendChild(empty);
    return;
  }

  for (const h of profile.headers) {
    const row = document.createElement("div");
    row.className = "row" + (h.enabled ? "" : " disabled");
    row.setAttribute("role", "listitem");

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "chk";
    chk.checked = !!h.enabled;
    chk.title = "Enable this header";
    chk.setAttribute("aria-label", "Enable header");
    chk.addEventListener("change", () => {
      h.enabled = chk.checked;
      row.classList.toggle("disabled", !h.enabled);
      save();
    });

    const name = document.createElement("input");
    name.type = "text";
    name.value = h.name || "";
    name.placeholder = "Header name";
    name.spellcheck = false;
    name.maxLength = 256;
    name.dataset.role = "name";
    name.setAttribute("aria-label", "Header name");
    // Offer autocomplete suggestions only while the field is empty. Once the
    // user types, detach the datalist so the arrow (and its flicker) disappear.
    const syncNameList = () => {
      if (name.value) name.removeAttribute("list");
      else name.setAttribute("list", "headerNames");
    };
    syncNameList();
    name.addEventListener("input", () => {
      h.name = name.value;
      syncNameList();
      revalidateNames();
      save();
    });

    const value = document.createElement("input");
    value.type = "text";
    value.value = h.value || "";
    value.placeholder = "Value";
    value.spellcheck = false;
    value.maxLength = 8192;
    value.setAttribute("aria-label", "Header value");
    value.addEventListener("input", () => {
      h.value = value.value;
      save();
    });

    const del = document.createElement("button");
    del.type = "button";
    del.className = "del";
    del.textContent = "\u00d7";
    del.title = "Remove header";
    del.setAttribute("aria-label", "Remove header");
    del.addEventListener("click", () => {
      profile.headers = profile.headers.filter((x) => x.id !== h.id);
      save();
      render();
    });

    row.append(chk, name, value, del);
    els.rows.appendChild(row);
  }

  revalidateNames();
}

// Flag header-name inputs that have invalid characters or duplicate names.
function revalidateNames() {
  const inputs = els.rows.querySelectorAll('input[data-role="name"]');
  const counts = {};
  inputs.forEach((inp) => {
    const key = inp.value.trim().toLowerCase();
    if (key) counts[key] = (counts[key] || 0) + 1;
  });
  inputs.forEach((inp) => {
    const val = inp.value.trim();
    const badChars = val && !isValidHeaderName(val);
    const dup = val && counts[val.toLowerCase()] > 1;
    const bad = badChars || dup;
    inp.classList.toggle("invalid", !!bad);
    inp.setAttribute("aria-invalid", bad ? "true" : "false");
    inp.title = badChars
      ? "Invalid header name — no spaces or special characters"
      : dup
      ? "Duplicate header name — only one will apply"
      : "";
  });
}

function addHeader(name = "", value = "", enabled = true) {
  const profile = activeProfile();
  if (!profile) return;
  profile.headers.push({ id: uid(), name, value, enabled });
  save();
  render();
}

function newProfile(name, headers = []) {
  const profile = { id: uid(), name, headers };
  state.profiles.push(profile);
  state.activeProfileId = profile.id;
  return profile;
}

// --- Domains -----------------------------------------------------------------

function normalizeDomain(input) {
  let d = (input || "").trim().toLowerCase();
  if (!d) return "";
  // Strip scheme, path, port and any leading wildcard/dot.
  d = d.replace(/^[a-z]+:\/\//, "").replace(/\/.*$/, "").replace(/:.*$/, "");
  d = d.replace(/^\*?\./, "");
  // Basic host shape: one or more labels separated by dots. A single label is
  // allowed so local/internal hosts like "localhost" work; IPv4 is accepted too.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(d)) {
    return "";
  }
  return d;
}

function originsFor(domain) {
  // Subdomain wildcards are invalid for IP addresses, so only include the
  // exact-host pattern for those.
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(domain);
  return isIp ? [`*://${domain}/*`] : [`*://${domain}/*`, `*://*.${domain}/*`];
}

function renderDomains() {
  els.domainsCount.textContent = `(${state.domains.length})`;
  els.domainList.innerHTML = "";
  if (!state.domains.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No domains yet. Add one to start injecting headers.";
    els.domainList.appendChild(empty);
  } else {
    for (const domain of state.domains) {
      const item = document.createElement("div");
      item.className = "domain-item";

      const label = document.createElement("span");
      label.className = "domain-name";
      label.textContent = domain;

      const del = document.createElement("button");
      del.type = "button";
      del.className = "del";
      del.textContent = "\u00d7";
      del.title = "Remove domain";
      del.setAttribute("aria-label", `Remove domain ${domain}`);
      del.addEventListener("click", () => removeDomain(domain));

      item.append(label, del);
      els.domainList.appendChild(item);
    }
  }
  updateAddCurrentBtn();
}

// Show a one-click shortcut to add the current tab's host when it is not
// already covered by an approved domain.
function updateAddCurrentBtn() {
  const btn = els.addCurrentBtn;
  if (!btn) return;
  const host = normalizeDomain(currentTabHost || "");
  if (host && !hostInScope(currentTabHost)) {
    btn.textContent = `+ Add current site (${host})`;
    btn.hidden = false;
  } else {
    btn.hidden = true;
  }
}

function addDomain(rawInput) {
  const domain = normalizeDomain(rawInput);
  if (!domain) {
    showToast("Invalid domain");
    return;
  }
  if (state.domains.includes(domain)) {
    showToast("Domain already added");
    return;
  }
  // Persist the domain immediately, BEFORE requesting permission. Chrome's
  // permission prompt can close the popup (destroying this context) before the
  // request resolves, so saving first prevents the domain from being lost.
  // We intentionally do not await storage here so the permission request stays
  // within the user gesture.
  state.domains.push(domain);
  saveDomains();
  renderDomains();
  renderScope();

  // Ask the user to grant host access (declarativeNetRequest only modifies
  // headers on hosts the extension has permission for).
  chrome.permissions
    .request({ origins: originsFor(domain) })
    .then((granted) => {
      if (granted) {
        showToast("Domain added");
      } else {
        // Roll back if the popup is still open and the user declined. If the
        // popup already closed, init()'s reconciliation removes it on reopen.
        state.domains = state.domains.filter((d) => d !== domain);
        saveDomains();
        renderDomains();
        renderScope();
        showToast("Permission denied");
      }
    })
    .catch(() => {
      /* popup likely closed; domain is saved and reconciled on reopen */
    });
}

async function removeDomain(domain) {
  state.domains = state.domains.filter((d) => d !== domain);
  await saveDomains();
  renderDomains();
  renderScope();
  // Revoke the optional host permission if it was granted (manifest defaults
  // cannot be removed and will simply be ignored).
  try {
    await chrome.permissions.remove({ origins: originsFor(domain) });
  } catch (e) {
    /* ignore */
  }
  showToast("Domain removed");
}

// --- Current-tab scope indicator --------------------------------------------

let currentTabHost = null;

async function detectTabHost() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && /^https?:/.test(tab.url)) {
      currentTabHost = new URL(tab.url).hostname;
    } else {
      currentTabHost = null;
    }
  } catch (e) {
    currentTabHost = null;
  }
}

function hostInScope(host) {
  if (!host) return false;
  return state.domains.some((d) => host === d || host.endsWith("." + d));
}

function renderScope() {
  if (!currentTabHost) {
    els.scopeDot.className = "scope-dot neutral";
    els.scopeText.textContent = "No page in scope check";
    return;
  }
  if (hostInScope(currentTabHost)) {
    els.scopeDot.className = "scope-dot on";
    els.scopeText.textContent = `Applies on ${currentTabHost}`;
  } else {
    els.scopeDot.className = "scope-dot off";
    els.scopeText.textContent = `Not in scope: ${currentTabHost}`;
  }
}

// --- Import / Export ---------------------------------------------------------

function sanitizeHeaders(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((h) => h && typeof h === "object")
    .map((h) => ({
      id: uid(),
      name: typeof h.name === "string" ? h.name : "",
      value: h.value != null ? String(h.value) : "",
      enabled: h.enabled !== false
    }));
}

function exportActiveProfile() {
  const profile = activeProfile();
  if (!profile) return;

  // Warn before exporting anything that looks like a credential.
  const hasSecret = profile.headers.some(
    (h) => SECRET_RE.test(h.name || "") || SECRET_RE.test(h.value || "")
  );
  if (hasSecret) {
    const ok = window.confirm(
      "This profile contains what looks like credentials (e.g. Authorization, token, cookie).\n\n" +
        "The exported file stores these values in plain text. Export anyway?"
    );
    if (!ok) return;
  }

  const payload = {
    type: "qa-header-tool-profile",
    version: 1,
    profile: {
      name: profile.name,
      headers: profile.headers.map((h) => ({
        name: h.name,
        value: h.value,
        enabled: h.enabled
      }))
    }
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = profile.name.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
  a.href = url;
  a.download = `headers-${safeName || "profile"}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Profile exported");
}

// Accepts: {type,profile}, a bare {name,headers}, {profiles:[...]}, or an array.
function extractProfiles(data) {
  const out = [];
  const pushProfile = (p, fallbackName) => {
    if (!p || typeof p !== "object") return;
    out.push({
      id: uid(),
      name: typeof p.name === "string" && p.name.trim() ? p.name : fallbackName,
      headers: sanitizeHeaders(p.headers)
    });
  };

  if (Array.isArray(data)) {
    data.forEach((p, i) => pushProfile(p, `Imported ${i + 1}`));
  } else if (data && Array.isArray(data.profiles)) {
    data.profiles.forEach((p, i) => pushProfile(p, `Imported ${i + 1}`));
  } else if (data && data.profile) {
    pushProfile(data.profile, "Imported");
  } else {
    pushProfile(data, "Imported");
  }
  return out;
}

async function importFromFile(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const imported = extractProfiles(data);
    if (!imported.length) {
      showToast("Nothing to import");
      return;
    }
    state.profiles.push(...imported);
    state.activeProfileId = imported[imported.length - 1].id;
    await save();
    render();
    showToast(
      imported.length === 1
        ? "Profile imported"
        : `${imported.length} profiles imported`
    );
  } catch (e) {
    showToast("Invalid JSON file");
  }
}

// --- Wiring ------------------------------------------------------------------

function bind() {
  els.master.addEventListener("change", () => {
    state.masterEnabled = els.master.checked;
    save();
    showToast(state.masterEnabled ? "Headers enabled" : "Headers disabled");
  });

  els.profileSelect.addEventListener("change", () => {
    state.activeProfileId = els.profileSelect.value;
    save();
    render();
  });

  els.newBtn.addEventListener("click", () => {
    const name = (window.prompt("New profile name:", "New profile") || "").trim();
    if (!name) return;
    newProfile(name);
    save();
    render();
    showToast("Profile created");
  });

  els.renameBtn.addEventListener("click", () => {
    const profile = activeProfile();
    if (!profile) return;
    const name = (window.prompt("Rename profile:", profile.name) || "").trim();
    if (!name) return;
    profile.name = name;
    save();
    render();
  });

  els.deleteBtn.addEventListener("click", () => {
    if (state.profiles.length <= 1) return;
    const profile = activeProfile();
    if (!profile) return;
    if (!window.confirm(`Delete profile "${profile.name}"?`)) return;
    state.profiles = state.profiles.filter((p) => p.id !== profile.id);
    state.activeProfileId = state.profiles[0].id;
    save();
    render();
    showToast("Profile deleted");
  });

  els.addBtn.addEventListener("click", () => addHeader());
  els.exportBtn.addEventListener("click", exportActiveProfile);
  els.importBtn.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", () => {
    const file = els.importFile.files[0];
    if (file) importFromFile(file);
    els.importFile.value = "";
  });

  els.themeToggleBtn.addEventListener("click", () => toggleTheme());

  els.domainAddForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = els.domainInput.value;
    els.domainInput.value = "";
    addDomain(value);
  });

  els.addCurrentBtn.addEventListener("click", () => {
    if (currentTabHost) addDomain(currentTabHost);
  });
}

async function init() {
  loadTheme();

  const data = await chrome.storage.local.get([
    "masterEnabled",
    "profiles",
    "activeProfileId",
    "domains",
    "headers"
  ]);
  state.masterEnabled = data.masterEnabled !== false;
  state.profiles = Array.isArray(data.profiles) ? data.profiles : [];
  state.domains =
    Array.isArray(data.domains) && data.domains.length
      ? data.domains
      : DEFAULT_DOMAINS.slice();

  // Persist the seeded domains on first run.
  if (!Array.isArray(data.domains)) {
    await saveDomains();
  }

  // Migrate a legacy flat headers array into a Default profile.
  if (!state.profiles.length) {
    const legacy = sanitizeHeaders(data.headers);
    newProfile("Default", legacy);
    await chrome.storage.local.remove("headers");
    await save();
  }

  state.activeProfileId =
    data.activeProfileId && state.profiles.some((p) => p.id === data.activeProfileId)
      ? data.activeProfileId
      : state.profiles[0].id;

  await reconcileDomainPermissions();
  await detectTabHost();

  render();
  renderDomains();
  renderScope();
  bind();
}

init();
