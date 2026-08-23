# Repository bootstrap and dependency policy

Status: Accepted Phase 0 baseline
Task: FND-009
Recorded: 2026-08-22

## Decisions

- Permanent Home Assistant integration domain: `ai_orchestrator`.
- Working display name: `AI Orchestrator`; the display/sidebar label may change without changing the domain.
- Initial compatibility target: exactly Home Assistant Core `2026.8.3` and Frontend `20260729.7`, matching the inspected Home Assistant Green.
- Python: `>=3.14.2,<3.15`. Home Assistant Core `2026.8.3` declares `>=3.14.2`; the development workstation has Python `3.14.5`.
- Node.js: `>=24.15.0,<25`; the development workstation baseline is Node `24.16.0` with npm `12.0.2`. `packageManager` is pinned to `npm@12.0.2`.
- Python environment/lock tool: `uv`; the development workstation has `uv 0.12.1`.
- Frontend: TypeScript `6.0.3`, Lit `3.3.3`, Vite `8.2.2`, and Vitest Browser Mode with Playwright.
- Phase 0 has no third-party runtime dependency in `manifest.json`. Provider SDKs and transports are not part of the skeleton.
- Architecture-specific dependencies are prohibited until the relevant task records the host architecture and measured dependency behavior. Exact CPU architecture does not block this pure Python/JavaScript skeleton.
- The implementation will use the HACS integration directory layout and will produce a manual-copy bundle. HACS installation/update support is not claimed until a compatible public remote repository, required metadata, and a real HACS validation/install/update test exist.
- Development does not deploy to or modify the user's live Home Assistant instance unless a later task explicitly claims and authorizes that action.

## Evidence

- Live environment: [`docs/evidence/2026-08-22-home-assistant-environment.md`](../evidence/2026-08-22-home-assistant-environment.md).
- Home Assistant Core `2026.8.3` declares Python `>=3.14.2`: [tagged Core pyproject](https://raw.githubusercontent.com/home-assistant/core/2026.8.3/pyproject.toml).
- Custom integrations require a `version` and use `custom_components/<domain>`: [Home Assistant integration manifest](https://developers.home-assistant.io/docs/creating_integration_manifest/).
- Config entries and config flows: [Home Assistant config flow](https://developers.home-assistant.io/docs/core/integration/config_flow/).
- Static assets: [async static path registration](https://developers.home-assistant.io/blog/2024/06/18/async_register_static_paths/).
- Custom panel properties and YAML-documented fallback: [creating custom panels](https://developers.home-assistant.io/docs/frontend/custom-ui/creating-custom-panels/).
- HACS integration layout and metadata requirements: [HACS integration requirements](https://www.hacs.xyz/docs/publish/integration/).
- HACS states that only public GitHub repositories work with HACS: [HACS general requirements](https://www.hacs.xyz/docs/publish/start/).
- Node/Vite requirements: [Vite guide](https://vite.dev/guide/) and [Node release status](https://nodejs.org/en/about/previous-releases).

Sources and package metadata were retrieved on 2026-08-22. Package versions below were also verified against their registries before being pinned.

## Repository layout

```text
custom_components/ai_orchestrator/  Home Assistant integration and bundled panel
frontend/                           TypeScript/Lit source and browser tests
scripts/                            deterministic build/sync/validation helpers
tests/                              Home Assistant, provider, security, and schema tests
docs/quality/schemas/               committed evidence and fixture schemas
docs/quality/templates/             synthetic examples
docs/evidence/manifests/            reviewed redacted evidence manifests
artifacts/                           uncommitted raw test/build output
```

Only one integration directory may exist under `custom_components/` for the HACS packaging path.

## Python policy

The project metadata created by the bootstrap must pin the Phase 0 test environment:

- `homeassistant==2026.8.3`
- `home-assistant-frontend==20260729.7`; required by the Linux integration test environment when `frontend` and `panel_custom` initialize
- `pytest-homeassistant-custom-component==0.13.357`; its published metadata also pins `homeassistant==2026.8.3`
- `ruff==0.16.4`
- `jsonschema==4.26.0`

Production integration code may use Home Assistant's installed dependencies only when they are part of the documented Core surface used by the integration. New runtime libraries require a dependency review, architecture/wheel check, event-loop review, license record, and a measured Home Assistant Green test before entering `manifest.json`.

## Frontend policy

Pinned direct dependencies:

- Runtime: `lit@3.3.3`.
- Build/test: `vite@8.2.2`, `typescript@6.0.3`, `vitest@4.1.11`, `@vitest/browser-playwright@4.1.11`, `playwright@1.62.1`, and `axe-core@4.13.0`.
- Static analysis: `eslint@10.9.0`, `@eslint/js@10.0.1`, `typescript-eslint@8.67.0`, `eslint-plugin-lit@2.3.1`, `eslint-plugin-wc@3.1.0`, `globals@17.11.0`, and `@types/node@24.13.3`.

TypeScript `7.0.2` is deliberately not selected because `typescript-eslint@8.67.0` declares TypeScript `<6.1.0`. The bundle must be one self-contained ES module: no CDN, dynamic imports, runtime fonts/images, Home Assistant private frontend imports, Node polyfills, or browser-persisted secrets.

## Build and verification commands

From the repository root:

```powershell
uv sync --frozen
uv run ruff check .
uv run pytest
npm --prefix frontend ci
npm --prefix frontend exec -- playwright install chromium
npm --prefix frontend run check
npm --prefix frontend run build
node scripts/sync-frontend.mjs
node scripts/verify-frontend-bundle.mjs
```

The unqualified `uv run pytest` command is the Linux/CI full-suite command. On the current Windows workstation, the pinned Home Assistant pytest helper imports Unix-only `fcntl` during plugin initialization. Pure schema/security tests use the isolated command documented in `docs/quality/EVIDENCE-CONVENTIONS.md`; Home Assistant lifecycle tests require a Linux runner/container or approved development-instance path and cannot inherit the pure-suite result.

`sync-frontend.mjs` copies the single build artifact into the integration. `verify-frontend-bundle.mjs` must fail when Vite emits any extra runtime chunk/asset or when `frontend/dist/ai-orchestrator-panel.js` and `custom_components/ai_orchestrator/frontend/ai-orchestrator-panel.js` are not byte-identical. The generated integration-side JavaScript is committed because both manual copies and HACS-style repository installs must contain every runtime file under `custom_components/ai_orchestrator/`.

## Installation and update boundary

During Phase 0 the supported development artifact is a manual-copy bundle containing `custom_components/ai_orchestrator/`. The live Home Assistant instance is not a development checkout.

The repository is now public at `https://github.com/ewaisg/HA-AI-Orchestrator` and remains structurally suitable for later HACS validation. HACS support is still incomplete because required repository metadata, a code-owner identifier, brand assets, and real HACS validation/install/update evidence are absent. GitHub releases are optional in HACS and are not a blocker. A public repository and a validated HACS-installable integration are separate claims.

## Compatibility boundary

Only Core `2026.8.3` is a test target in Phase 0. No claim is made for another patch, the immediately previous monthly release, beta, mobile/Companion rendering, panel cache behavior, or upgrade survival until FND-011 records real results.

Programmatic panel registration remains isolated in a compatibility module because public panel documentation describes YAML registration, while Core source exposes the automatic registration helpers. The skeleton must keep the documented YAML fallback and may not describe zero-YAML registration as stable until the live spike passes.

## Remaining non-blocking inputs

- A repository hosting choice and any GitHub owner/organization metadata before HACS distribution work.
- The user's later choice of manual-only versus a public GitHub custom repository used privately and not submitted to HACS defaults.
- Exact CPU architecture before any architecture-specific dependency or Bedrock SDK decision.
- Browser/device test matrix before a compatibility promise.
- An available Linux execution path for the Home Assistant lifecycle suite; Docker Desktop is installed on the workstation but its Linux engine was not running at the 2026-08-22 check.
