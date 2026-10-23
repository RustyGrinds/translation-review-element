# translation-review-element v0.1.0

First source release. **MIT licensed.**

A lightweight, framework-independent translation-review Web Component by **Rusty Grinds Productions (RGP)**. Compare original and translated passages, suggest clearer wording or leave a comment, and prepare feedback for human review without an account, backend or AI service.

This first version includes stable passage/revision metadata, source and target language tags, in-memory passage drafts, validation, a cancelable submission event, an optional user-controlled mailto draft adapter, and plain-text copy/download fallbacks. Its responsive, unbranded-by-default interface offers host-configurable muted light/dark themes, native keyboard controls, visible focus, reduced-motion support and large-text reflow. The static demo uses local assets and system fonts; the runtime has zero dependencies and needs no build step.

Five unit-test groups and fourteen browser-check groups each passed in installed Chrome and Edge, Playwright Firefox, and Windows WebKit. WebKit checks are not actual Safari verification. Actual Safari/iOS, screen readers, physical mobile devices and real email-client behavior remain unverified. The interface is currently English; drafts are not retained after reload.

Suggestions never auto-publish and the included mailto adapter never sends email automatically. No adoption, stars, external-user or production-deployment claims are made.
