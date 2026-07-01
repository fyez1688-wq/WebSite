# Changelog

## v0.1.0 - 2026-07-02

- Added portable Windows startup flow.
- Added installer builder and self-extracting setup package support.
- Added desktop/start-menu shortcut creation during install.
- Renamed homepage section to feature modules and removed the local server card.
- Improved refresh responsiveness by removing artificial loading delay and deferring non-critical work.
- Added HTTP cache validators and long-lived immutable cache headers for versioned static assets.
- Added `/api/songs` short cache to avoid repeated directory scans.
- Hardened watchdog restart behavior to avoid unnecessary tunnel restarts.
- Added Git ignore rules for runtime data, build outputs, installers, logs, and machine-specific Cloudflare config.
- Replaced repository defaults for secrets/tokens with placeholder values.
