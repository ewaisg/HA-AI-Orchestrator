"""Home Assistant panel compatibility boundary.

Programmatic registration uses helpers present in Home Assistant Core 2026.8.3
but not documented as a stable custom-integration API. Keep them isolated here.

Automatic registration and the YAML fallback are mutually exclusive modes. By
default, leave YAML absent and let the integration register the panel. If the
automatic compatibility spike fails, unload the integration, add exactly this
``configuration.yaml`` entry, and restart Home Assistant::

    panel_custom:
      - name: ai-orchestrator-panel
        url_path: ai-orchestrator
        sidebar_title: AI Orchestrator
        sidebar_icon: mdi:robot-outline
        module_url: /api/ai_orchestrator/static/ai-orchestrator-panel.js
        require_admin: true

The manifest depends on ``panel_custom``, so a compatible YAML fallback is
registered before config-entry setup. The integration validates that existing
panel and leaves it user-owned. A foreign or incompatible panel at the same URL
path fails setup instead of being overwritten or silently accepted.
"""

import hashlib
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryError

from .const import (
    NAME,
    PANEL_CACHE_BUST_LENGTH,
    PANEL_CACHE_BUST_QUERY,
    PANEL_ELEMENT_NAME,
    PANEL_FILENAME,
    PANEL_MODULE_URL,
    PANEL_SIDEBAR_ICON,
    PANEL_STATIC_URL,
    PANEL_URL_PATH,
)

_PANEL_DIRECTORY = Path(__file__).parent / "frontend"
_PANEL_BUNDLE = _PANEL_DIRECTORY / PANEL_FILENAME


def panel_bundle_fingerprint() -> str | None:
    """Return a short content hash of the bundled panel, or None if unreadable.

    The frontend service worker caches the panel module response, so a changed
    bundle must be requested at a different URL. Content addressing makes the
    URL change exactly when the bytes change.
    """
    try:
        data = _PANEL_BUNDLE.read_bytes()
    except OSError:
        return None
    return hashlib.sha256(data).hexdigest()[:PANEL_CACHE_BUST_LENGTH]


def panel_module_url() -> str:
    """Return the versioned module URL used to register and validate the panel."""
    fingerprint = panel_bundle_fingerprint()
    if fingerprint is None:
        return PANEL_MODULE_URL
    return f"{PANEL_MODULE_URL}?{PANEL_CACHE_BUST_QUERY}={fingerprint}"


def _expected_custom_panel_config(module_url: str) -> dict[str, object]:
    """Return the exact panel_custom config this integration accepts."""
    return {
        "name": PANEL_ELEMENT_NAME,
        "embed_iframe": False,
        "trust_external": False,
        "handle_safe_area": False,
        "module_url": module_url,
    }


def _is_compatible_panel(panel: frontend.Panel) -> bool:
    """Return whether an existing panel is the exact supported YAML fallback.

    Both the unversioned URL (a hand-written YAML fallback) and the versioned
    URL this integration registers are accepted, because the YAML fallback
    documented in this module's docstring cannot know the content hash.
    """
    if panel.component_name != "custom" or panel.require_admin is not True:
        return False
    return any(
        panel.config == {"_panel_custom": _expected_custom_panel_config(url)}
        for url in (panel_module_url(), PANEL_MODULE_URL)
    )


async def async_register_static_assets(hass: HomeAssistant) -> None:
    """Serve the bundled panel through Home Assistant's documented HTTP API."""
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                PANEL_STATIC_URL,
                str(_PANEL_DIRECTORY),
                cache_headers=False,
            )
        ]
    )


async def async_register_panel(hass: HomeAssistant) -> bool:
    """Register the admin-only panel and report whether this integration owns it."""
    existing = hass.data.get(frontend.DATA_PANELS, {}).get(PANEL_URL_PATH)
    if existing is not None:
        if not isinstance(existing, frontend.Panel) or not _is_compatible_panel(
            existing
        ):
            raise ConfigEntryError(
                "AI Orchestrator panel path is already registered by an "
                "incompatible panel"
            )
        return False

    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_ELEMENT_NAME,
        sidebar_title=NAME,
        sidebar_icon=PANEL_SIDEBAR_ICON,
        module_url=panel_module_url(),
        require_admin=True,
    )
    return True


@callback
def async_unregister_panel(hass: HomeAssistant) -> None:
    """Remove the source-registered panel without touching the static route."""
    frontend.async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)
