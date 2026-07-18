# Header Tool

A safe, internal Chrome extension (Manifest V3) to inject and toggle custom HTTP
request headers on domains you approve. Built as a transparent, dependency-free
replacement for third-party header modifiers.

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

## Install (unpacked)

1. Clone this repo.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.

## Usage

1. Click the toolbar icon to open the popup.
2. Toggle the master **Headers** switch on.
3. Add a header (e.g. `FutureContentEnabled` = `true`) and enable its checkbox.
4. Open **Domains** to add or remove approved domains. Adding a domain requests
   host permission for that domain only.
5. The scope indicator shows whether headers apply to the current tab.

Headers are applied to requests on approved domains and their subdomains.

## Permissions

| Permission | Why |
|---|---|
| `declarativeNetRequest` | Add/modify HTTP request headers (core function). |
| `storage` | Save header profiles and settings locally. |
| `activeTab` | Read the current tab URL to show whether headers apply. |
| `host_permissions` | Apply headers on the pre-approved internal environments. |
| `optional_host_permissions` (`*://*/*`) | Requested per-domain, only when the user explicitly adds a domain. |

Default approved domains: `vml.dev`, `acura.com`, `autos.honda.com`,
`automobiles.honda.com`.

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
