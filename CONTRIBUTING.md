# Contributing

Open an issue for a concrete bug or proposed improvement. Include the relevant design direction, device/browser, expected behavior and steps to reproduce. Never include passwords, recovery keys, session cookies or private database exports.

Keep the poker engine, authentication and multiplayer state shared across all design directions. UI explorations should not duplicate game logic. Use existing components and tokens where appropriate, and respect reduced-motion and sound preferences.

Run `npm run typecheck`, `npm test` and `npm run build`. For changes to persistence, actions, authentication or streams, run the relevant HTTP verification against a database you control. Include screenshots for visual changes and explain what was tested.

Do not add claims of real-money play, guaranteed odds, inferred opponent cards or unmeasured scale. The probability companion only uses visible information. Source reuse remains subject to the project’s license status and third-party licenses.
