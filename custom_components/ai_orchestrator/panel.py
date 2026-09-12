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
    DOMAIN,
    NAME,
    PANEL_CACHE_BUST_LENGTH,
    PANEL_ELEMENT_NAME,
    PANEL_FILENAME,
    PANEL_MODULE_URL,
    PANEL_SIDEBAR_ICON,
    PANEL_STATIC_URL,
    PANEL_URL_PATH,
    PANEL_VERSIONED_URL_BASE,
)

_PANEL_DIRECTORY = Path(__file__).parent / "frontend"
_PANEL_BUNDLE = _PANEL_DIRECTORY / PANEL_FILENAME
_DATA_VERSIONED_STATIC_URLS = f"{DOMAIN}_versioned_static_urls"


def panel_bundle_fingerprint() -> str | None:
    """Return a short content hash of the bundled panel, or None if unreadable.

    The frontend service worker caches the panel module response, so a changed
    bundle must be requested at a different URL. Content addressing makes the
    URL change exactly when the bytes change. The fingerprint is placed in the
    URL path, not the query string, because the service worker matches its
    cache while ignoring query parameters.
    """
    try:
        data = _PANEL_BUNDLE.read_bytes()
    except OSError:
        return None
    return hashlib.sha256(data).hexdigest()[:PANEL_CACHE_BUST_LENGTH]


def panel_versioned_static_url(fingerprint: str) -> str:
    """Return the content-addressed static URL prefix for one bundle fingerprint."""
    return f"{PANEL_VERSIONED_URL_BASE}/{fingerprint}"


def panel_module_url() -> str:
    """Return the versioned module URL used to register and validate the panel.

    The unversioned URL is returned only when the bundle cannot be read; it
    remains subject to the service worker's cache, as documented for the YAML
    fallback.
    """
    fingerprint = panel_bundle_fingerprint()
    if fingerprint is None:
        return PANEL_MODULE_URL
    return f"{panel_versioned_static_url(fingerprint)}/{PANEL_FILENAME}"


async def _async_ensure_versioned_static_path(
    hass: HomeAssistant, module_url: str
) -> None:
    """Serve the bundle directory at the content-addressed prefix, once per hash."""
    if module_url == PANEL_MODULE_URL:
        return
    prefix = module_url.removesuffix(f"/{PANEL_FILENAME}")
    registered: set[str] = hass.data.setdefault(_DATA_VERSIONED_STATIC_URLS, set())
    if prefix in registered:
        return
    await hass.http.async_register_static_paths(
        [StaticPathConfig(prefix, str(_PANEL_DIRECTORY), cache_headers=True)]
    )
    registered.add(prefix)


def _expected_custom_panel_config(module_url: str) -> dict[str, object]:
    """Return the exact panel_custom config this integration accepts."""
    return {
        "name": PANEL_ELEMENT_NAME,
        "embed_iframe": False,
        "trust_external": False,
        "handle_safe_area": False,
        "module_url": module_url,
    }


def _is_compatible_panel(panel: frontend.Panel, module_url: str) -> bool:
    """Return whether an existing panel is the exact supported YAML fallback.

    Both the unversioned URL (a hand-written YAML fallback) and the versioned
    URL this integration registers are accepted, because the YAML fallback
    documented in this module's docstring cannot know the content hash.
    """
    if panel.component_name != "custom" or panel.require_admin is not True:
        return False
    return any(
        panel.config == {"_panel_custom": _expected_custom_panel_config(url)}
        for url in (module_url, PANEL_MODULE_URL)
    )


async def async_register_static_assets(hass: HomeAssistant) -> None:
    """Serve the unversioned bundle path used only by the documented YAML fallback."""
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
    module_url = await hass.async_add_executor_job(panel_module_url)
    existing = hass.data.get(frontend.DATA_PANELS, {}).get(PANEL_URL_PATH)
    if existing is not None:
        if not isinstance(existing, frontend.Panel) or not _is_compatible_panel(
            existing, module_url
        ):
            raise ConfigEntryError(
                "AI Orchestrator panel path is already registered by an "
                "incompatible panel"
            )
        return False

    await _async_ensure_versioned_static_path(hass, module_url)
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_ELEMENT_NAME,
        sidebar_title=NAME,
        sidebar_icon=PANEL_SIDEBAR_ICON,
        module_url=module_url,
        require_admin=True,
    )
    return True


@callback
def async_unregister_panel(hass: HomeAssistant) -> None:
    """Remove the source-registered panel without touching the static route."""
    frontend.async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)
