# FND-015 live installation evidence - 2026-08-23

## Scope and source

This record contains a direct project-owner report after manually copying the
Phase 0 integration into the active Home Assistant installation. It is not an
independent browser observation and contains no household identifiers, network
addresses, credentials, entities, or provider settings.

## Reported result

- The AI Orchestrator integration installed successfully.
- The AI Orchestrator sidebar panel is visible.
- The Home section opens as the default section.
- The other planned menu sections are visible and show the expected unimplemented
  foundation state.

This report proves only the stated manual-install and initial-render scenario.
It does not prove provider connectivity, workflow behavior, action execution,
non-admin behavior, mobile rendering, unload/reload, restart recovery, cache
invalidation, upgrade behavior, removal, or the YAML fallback.

## Version boundary

The active environment was previously recorded as Home Assistant Core 2026.8.3
and Frontend 20260729.7. Those values were not re-read during this report and
must be revalidated before FND-011 compatibility acceptance.

## Next live evidence

FND-011 must record desktop and approved mobile rendering, unload/reload,
restart recovery, cache behavior, upgrade behavior, removal, and the isolated
YAML fallback on named Home Assistant versions.
