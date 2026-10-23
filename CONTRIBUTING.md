# Contributing

Author: **Rusty Grinds Productions (RGP)**.

The project is licensed under [MIT](LICENSE). Keep contributions compatible with that license and identify any third-party code or assets and their licenses. Discuss substantial changes before implementing them.

## Report a reproducible problem

Include the browser/version, operating system, viewport/text-size setting, minimal host markup or a synthetic passage, steps to reproduce, expected behavior and actual behavior. For accessibility problems, include the input method and assistive technology/version if relevant. Screenshots should omit private information. Do not post credentials, real reviewer notes, personal details or sensitive page URLs.

## Develop locally

```sh
node tools/serve.js
node --test tests/data.test.js
```

For browser checks:

```sh
npm install
npx playwright install chromium firefox webkit
npm run test:browser
```

Node 24.19.0 was used for the recorded verification; the project declares Node 20 or later. Other Node versions are not claimed as tested. Browser checks require local process and loopback-network access. Keep default browser security settings enabled.

## Keep changes focused

- Preserve native Web Components, the three-module runtime and zero runtime dependencies.
- Keep suggestions separate from published text; never add automatic sending, telemetry, persistent identifiers, hidden storage or external calls without an explicit design discussion.
- Render untrusted text as text, preserve page-reference query/credential stripping, and avoid personal data in examples.
- Preserve semantic labels, keyboard/focus behavior, touch operation, large-text reflow and reduced motion. Keep both themes accessible and host-customizable.
- Use synthetic test fixtures. Run meaningful checks for the changed behavior and report the exact browser engines used; WebKit is not actual Safari and a patched Firefox build is not retail Firefox.
- Keep generated logs, test results, browser caches, archives, secrets and local configuration out of proposed changes.

Use the source repository's issue and pull-request tools for ordinary bug reports and proposed fixes. No dedicated private security-reporting channel is currently configured; do not post secrets or sensitive data in public reports. Do not invent a maintainer email address.
