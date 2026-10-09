# Security

Report a vulnerability privately using the repository’s GitHub **Security → Report a vulnerability** option if available. If unavailable, use the maintainer’s published private contact channel and keep the report out of public issues. Do not include exploit details or secrets in public posts.

River is a play-chip application. The API owns game authority, validates inputs and same-origin requests, and checks membership and host permissions. Transactions lock room state, and receipts prevent duplicate commands. Each player receives a projection that excludes the deck, shuffle seed and other players’ private cards.

Profiles use HTTP-only, SameSite session cookies. Recovery keys are bearer credentials and are stored as hashes. They must be kept private. The guest recovery mechanism is not email-based identity or MFA.

Cloud database credentials stay server-side. TLS certificate and hostname verification are required. RLS is enabled on all River tables; browser roles must have no direct access. The dedicated server role owns its tables and does not require administrator or RLS-bypass privileges.

There is no claimed independent security audit, compliance certification or capacity guarantee. Preview and production should use separate databases before broader deployment.
