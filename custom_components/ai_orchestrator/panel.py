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

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryError

from .const import (
    NAME,
    PANEL_ELEMENT_NAME,
    PANEL_MODULE_URL,
    PANEL_SIDEBAR_ICON,
    PANEL_STATIC_URL,
    PANEL_URL_PATH,
)

_PANEL_DIRECTORY = Path(__file__).parent / "frontend"
_EXPECTED_CUSTOM_PANEL_CONFIG = {
    "name": PANEL_ELEMENT_NAME,
    "embed_iframe": False,
    "trust_external": False,
    "handle_safe_area": False,
    "module_url": PANEL_MODULE_URL,
}


def _is_compatible_panel(panel: frontend.Panel) -> bool:
    """Return whether an existing panel is the exact supported YAML fallback."""
    return (
        panel.component_name == "custom"
        and panel.require_admin is True
        and panel.config == {"_panel_custom": _EXPECTED_CUSTOM_PANEL_CONFIG}
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
        module_url=PANEL_MODULE_URL,
        require_admin=True,
    )
    return True


@callback
def async_unregister_panel(hass: HomeAssistant) -> None:
    """Remove the source-registered panel without touching the static route."""
    frontend.async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)
