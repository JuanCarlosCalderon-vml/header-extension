# Header Tool — Privacy Policy

_Last updated: 2026-07-13_

## Overview
Header Tool is a Chrome extension that injects and toggles custom HTTP request
headers on domains the user explicitly approves. It is designed for internal
testing and debugging.

## Data collection
Header Tool **does not collect, transmit, sell, or share any personal or usage
data**. There are no analytics, no tracking, no telemetry, and no external
network requests made by the extension.

## Data storage
All configuration created by the user — header profiles, header names/values,
enabled/disabled states, approved domains, and the theme preference — is stored
**locally on the user's device** via the Chrome `storage.local` API. This data
never leaves the device and is not accessible to the developer or any third
party. Uninstalling the extension removes this data.

## Permissions
- **declarativeNetRequest** — used solely to add/modify HTTP request headers
  according to the user's local configuration.
- **storage** — used to save the user's header profiles and settings locally.
- **activeTab** — used to read the current tab's URL only to indicate whether
  headers apply to the page being viewed.
- **Host permissions** — headers are applied only to domains the user explicitly
  adds. Broad host access is requested on a per-domain basis, only when the user
  opts in.

## Third parties
Header Tool does not include any third-party libraries, SDKs, remote code, or
services. No data is ever sent to the developer or any third party.

## Contact
For questions about this policy, contact the extension maintainer through the
distribution channel where you obtained the extension.
