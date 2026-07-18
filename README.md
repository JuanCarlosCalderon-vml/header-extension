# Header Tool

A safe, internal Chrome extension (Manifest V3) to inject and toggle custom HTTP
request headers on domains you approve. Built as a transparent, dependency-free
replacement for third-party header modifiers.

**[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/header-tool/oknnaggebijfnehbdempkkmjkjgpfdcc)**

- **Local only** — no analytics, no telemetry, no external network requests, no remote code.
- **Per-header toggles** — enable/disable individual headers without deleting them.
- **Profiles** — group headers into named profiles and switch between them.
- **Scoped by domain** — headers apply only to domains you explicitly approve.
- **Import / export** — share header configurations as JSON.
- **Light / dark theme**, keyboard accessible.

## Why

Some header-modifier extensions were removed for privacy concerns. Header Tool
does the same core job with a minimal, auditable codebase: vanilla JavaScript,
no build step, no dependencies, and no data ever leaving your device.

## How it works

Header Tool uses Chrome's [`declarativeNetRequest`](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
API. It maintains a single dynamic rule built from the active profile: every
enabled header with a valid name is applied (operation `set`) to requests whose
domain matches an approved domain. Configuration is stored locally via
`chrome.storage.local` and never transmitted.

## Install

### From the Chrome Web Store (recommended)

Install the published extension:
<https://chromewebstore.google.com/detail/header-tool/oknnaggebijfnehbdempkkmjkjgpfdcc>

### Unpacked (for development)

1. Clone this repo.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.

## User manual

### 1. Open the popup

Click the Header Tool icon in the toolbar. The popup shows, from top to bottom:
the master switch, a scope indicator, the profile bar, your header rows, the
Domains panel, and the footer actions (Export / Import / theme).

### 2. Turn headers on

Flip the **Headers** master switch (top-right of the header) to on. When off, no
headers are injected regardless of your configuration. The toolbar badge shows
how many headers are currently active.

### 3. Add and manage headers

1. Click **+ Add header**.
2. Type the header **name** (e.g. `FutureContentEnabled`). Suggestions appear
   when the field is empty.
3. Type the **value** (e.g. `true`).
4. Use the **checkbox** to enable or disable that header without deleting it.
5. Use the **×** to remove a row.

Invalid names (illegal characters or duplicates) are highlighted with a red
border and an explanatory tooltip; invalid rows are ignored until fixed.

### 4. Work with profiles

Profiles let you keep separate sets of headers (e.g. "Debug", "Future content").

- **Select** a profile from the dropdown to make it active.
- **+** creates a new profile.
- **Aa** renames the current profile.
- **trash** deletes the current profile.

Only the active profile's enabled headers are injected.

### 5. Approve domains

Headers apply **only** to approved domains and their subdomains. Open the
**Domains** panel to:

- **Add** a domain — Chrome asks you to grant host permission for that domain
  only. This keeps access explicit and minimal.
- **Remove** a domain — the corresponding permission is revoked.

The domain list starts empty; add the domains you need on first run.

### 6. Check scope on the current tab

The indicator under the header tells you whether headers apply to the page
you're on:

- **Green** — the current site is in scope and headers are active.
- **Red** — the current site is not an approved domain.
- **Grey** — no page/scope information is available.

### 7. Share configurations (import / export)

- **Export** downloads the active profile as `headers-<name>.json`. If a header
  name looks like a credential (e.g. `authorization`, `cookie`, `token`), you're
  asked to confirm before exporting.
- **Import** loads a profile from a JSON file. Accepted shapes: a single
  exported profile, a `{ profiles: [...] }` bundle, or a plain array of headers.

### 8. Switch theme

Use the sun/moon button in the footer to toggle light/dark mode. Your choice is
remembered.

> **Tip:** header names travel lowercase over HTTP/2, so DevTools may display
> them Title-Cased. This is normal — header names are case-insensitive.

## Permissions

| Permission | Why |
|---|---|
| `declarativeNetRequest` | Add/modify HTTP request headers (core function). |
| `storage` | Save header profiles and settings locally. |
| `activeTab` | Read the current tab URL to show whether headers apply. |
| `optional_host_permissions` (`*://*/*`) | Requested per-domain, only when the user explicitly adds a domain. |

No domains are approved by default — you add the ones you need from the Domains
panel, and each is granted host permission only at that moment.

## Project structure

```
manifest.json          Manifest V3 config
background.js          Service worker: rebuilds declarativeNetRequest rules
src/
  popup/
    popup.html         Popup UI
    popup.css          Styles (light/dark themes)
    popup.js           Popup logic (profiles, domains, import/export)
  shared/
    theme.js           Theme load/apply/toggle
icons/                 16 / 48 / 128 px icons
store-assets/          Chrome Web Store listing assets (screenshot, privacy policy)
```

## Verifying headers

DevTools' Network tab often shows the original request, not the modified one.
To confirm rules are active, open the extension's service worker console and run:

```js
await chrome.declarativeNetRequest.getDynamicRules();
await chrome.storage.local.get(["profiles", "activeProfileId", "domains", "masterEnabled"]);
```

Note: HTTP/2 sends header names lowercase on the wire; DevTools may display them
Title-Cased. Header names are case-insensitive per RFC 7230.

## Privacy

No data is collected or transmitted. See the [privacy policy](store-assets/PRIVACY.md).

## License

Internal tool. All rights reserved by the maintainer.
