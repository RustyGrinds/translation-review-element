# Verification — 2026-10-23

Checked on Windows with Node **24.19.0** and Playwright **1.62.1**. Rusty Grinds Productions (RGP) is the author credit. No build/transpile step or runtime dependencies are required.

## Automated results

`node --test tests/data.test.js`: **5/5 groups passed**, covering metadata validation, length limits, payload shape/immutability, URL credential/query/fragment stripping, mailto encoding, recipient/header injection rejection and oversized draft fallback. `node --check` passed for all three runtime modules, demo JavaScript and server JavaScript.

`node tests/browser.cjs`: **14/14 groups passed in each of four browser targets** (56 browser check groups). Generated machine-local logs/results are excluded from source distribution. Run the harness to create a fresh `test-results/browser-results.json` with exact local versions and outcomes.

| Target actually launched | Version | Result | Evidence boundary |
| --- | --- | --- | --- |
| Installed Google Chrome, channel `chrome` | 156.0.8078.47 | 14 groups passed | Actual Chrome, fresh headless automation context |
| Installed Microsoft Edge, channel `msedge` | 155.0.4283.62 | 14 groups passed | Actual Edge, fresh headless automation context |
| Playwright Firefox build | 153.0 | 14 groups passed | Playwright's patched Firefox build, not an installed retail Firefox/profile |
| Playwright WebKit engine | 26.5 | 14 groups passed | Windows automation engine; **not actual Safari** |
| Standalone Playwright Chromium | — | Unavailable; 0 checks | Its optional executable was not installed; actual Chrome and Edge ran separately |
| Actual Safari / iOS Safari | — | Unverified | Not available on this Windows machine |

The browser groups cover empty validation/focus, immutable event payloads and local export, actual text-file download, unsupported-download fallback, mocked clipboard success/denial with manual selection, per-passage drafts and revision isolation, Escape/focus restoration and keyboard reopening, literal untrusted text, sanitized references, adapter failure/pending/cancel/stale-completion behavior, intercepted mailto draft URLs, theme/contrast checks, 320/390px layout, 200% root text at 320px, reduced motion, emulated touch review preparation, and a JavaScript-disabled comparison fallback. No real email client was opened and no email was sent. Native clipboard OS permission prompts were not tested; both browser clipboard branches were injected deliberately.

No page errors or external requests were observed during those UI checks. Official Playwright test engines were cached locally. Browser caches, generated logs, machine-specific reports and development archives are excluded from the source distribution.

Default visible text contrast was checked from computed foreground/background styles across 58 visible text/control pairs per theme. All four engines measured minimum **5.248:1 in dark** and **4.763:1 in light**, above the 4.5:1 normal-text threshold. This is a focused automated text-color check, not a complete WCAG audit or AAA certification; selection colors, every possible state/token override and assistive technology behavior are not certified.

## Visual review

Chrome captures were visually inspected for desktop hierarchy, comparison columns, theme distinction, prepared-review feedback, mobile stacking and extreme large-text reflow. No authored white text or white backgrounds are used. The R/G/P accents remain small; the form has no imposed brand.

- [Desktop dark](docs/images/demo-dark.png)
- [Desktop light](docs/images/demo-light.png)

The browser harness can regenerate validation, prepared-review, mobile and large-text captures in its output directory. Those generated files are not bundled in the source release.

Two issues found by the checks were fixed: headline wrapping at 320px with doubled text, and explicit host-trigger focus restoration for WebKit's pointer-focus behavior. A light-theme secondary text color was darkened to preserve the text contrast threshold on the selected passage card.

## Execution boundaries and remaining checks

The browser harness requires local process execution and loopback-network access. It uses default browser security settings and does not weaken security flags/settings. Unavailable optional engines are reported explicitly, not counted as passes.

Remaining manual checks: actual Safari/macOS and iOS, physical mobile devices, screen readers (NVDA/VoiceOver), native clipboard/download prompts and real email-client draft handling, host-specific CSP/theme/framework integration, and fluent-human review of sample translations. No universal browser-compatibility claim is made.

## Local preview

Start the preview with `node tools/serve.js` at **http://127.0.0.1:4177/** (loopback only). It is not a deployment or a persistent service. Leave the process running while viewing it; stop with Ctrl+C. The automated browser harness starts and stops its own ephemeral server and isolated browsers.

These checks establish only the behavior described above. They do not establish universal compatibility, WCAG certification, adoption, external users or production deployments.
