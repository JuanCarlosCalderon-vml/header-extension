// Header Tool — background service worker
// Rebuilds declarativeNetRequest dynamic rules from stored headers.
// No network calls, no analytics — purely local rule management.

const RULE_ID = 1;

// Domains the header injection is allowed to touch. requestDomains matches the
// listed domain and any subdomain. The list is empty by default; users add the
// domains they need from the popup, and each one is granted host permission at
// that moment. The active list lives in chrome.storage.local under "domains".
const DEFAULT_DOMAINS = [];

// RFC 7230 token — only valid HTTP header name characters.
const HEADER_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

const RESOURCE_TYPES = [
  "main_frame",
  "sub_frame",
  "xmlhttprequest",
  "script",
  "stylesheet",
  "image",
  "font",
  "other"
];

async function rebuildRules() {
  const {
    masterEnabled = true,
    profiles = [],
    activeProfileId = null,
    domains = DEFAULT_DOMAINS
  } = await chrome.storage.local.get([
    "masterEnabled",
    "profiles",
    "activeProfileId",
    "domains"
  ]);

  // Remove any dynamic rules we previously created.
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  const profile =
    profiles.find((p) => p && p.id === activeProfileId) || profiles[0] || null;
  const headers = profile && Array.isArray(profile.headers) ? profile.headers : [];

  // Only inject headers with a valid HTTP token name; invalid names would make
  // Chrome reject the whole rule.
  const activeHeaders = masterEnabled
    ? headers.filter(
        (h) => h.enabled && h.name && HEADER_NAME_RE.test(h.name.trim())
      )
    : [];

  const activeDomains = Array.isArray(domains)
    ? domains.filter((d) => typeof d === "string" && d.trim())
    : [];

  const addRules = [];
  if (activeHeaders.length && activeDomains.length) {
    addRules.push({
      id: RULE_ID,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: activeHeaders.map((h) => ({
          header: h.name.trim(),
          operation: "set",
          value: h.value != null ? String(h.value) : ""
        }))
      },
      condition: {
        requestDomains: activeDomains,
        resourceTypes: RESOURCE_TYPES
      }
    });
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules
  });

  updateBadge(activeHeaders.length, masterEnabled);
}

function updateBadge(count, masterEnabled) {
  const text = masterEnabled && count ? String(count) : "";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
}

chrome.runtime.onInstalled.addListener(rebuildRules);
chrome.runtime.onStartup.addListener(rebuildRules);

chrome.storage.onChanged.addListener((changes, area) => {
  if (
    area === "local" &&
    (changes.profiles ||
      changes.masterEnabled ||
      changes.activeProfileId ||
      changes.domains)
  ) {
    rebuildRules();
  }
});
