"""Tests for the isolated Home Assistant panel compatibility boundary."""

import hashlib
import threading
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

import pytest
from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryError

from custom_components.ai_orchestrator.const import (
    NAME,
    PANEL_CACHE_BUST_LENGTH,
    PANEL_ELEMENT_NAME,
    PANEL_MODULE_URL,
    PANEL_SIDEBAR_ICON,
    PANEL_STATIC_URL,
    PANEL_URL_PATH,
)
from custom_components.ai_orchestrator.panel import (
    async_register_panel,
    async_register_static_assets,
    async_unregister_panel,
    panel_bundle_fingerprint,
    panel_module_url,
)


async def test_register_static_assets(hass: HomeAssistant) -> None:
    """The bundled directory uses the documented async static-path API."""
    http = Mock()
    http.async_register_static_paths = AsyncMock()
    with patch.object(hass, "http", http):
        await async_register_static_assets(hass)

    register_paths = http.async_register_static_paths
    register_paths.assert_awaited_once()
    configs = register_paths.await_args.args[0]
    assert len(configs) == 1
    assert configs[0] == StaticPathConfig(
        PANEL_STATIC_URL,
        str(
            Path(__file__).parents[2]
            / "custom_components"
            / "ai_orchestrator"
            / "frontend"
        ),
        False,
    )


async def test_register_panel_is_admin_only(hass: HomeAssistant) -> None:
    """The compatibility adapter registers one admin-only custom panel."""
    expected_module_url = await hass.async_add_executor_job(panel_module_url)
    owns_panel = await async_register_panel(hass)

    assert owns_panel is True
    panel = hass.data[frontend.DATA_PANELS][PANEL_URL_PATH]
    assert panel.component_name == "custom"
    assert panel.require_admin is True
    assert panel.config == {
        "_panel_custom": {
            "name": PANEL_ELEMENT_NAME,
            "embed_iframe": False,
            "trust_external": False,
            "handle_safe_area": False,
            "module_url": expected_module_url,
        }
    }


async def test_compatible_yaml_fallback_is_accepted_and_user_owned(
    hass: HomeAssistant,
) -> None:
    """An exact admin-only YAML fallback loads first and remains user-owned."""
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_ELEMENT_NAME,
        sidebar_title=NAME,
        sidebar_icon=PANEL_SIDEBAR_ICON,
        module_url=PANEL_MODULE_URL,
        require_admin=True,
    )
    existing = hass.data[frontend.DATA_PANELS][PANEL_URL_PATH]

    owns_panel = await async_register_panel(hass)

    assert owns_panel is False
    assert hass.data[frontend.DATA_PANELS][PANEL_URL_PATH] is existing


@pytest.mark.parametrize(
    ("element_name", "module_url", "require_admin"),
    [
        ("foreign-panel", PANEL_MODULE_URL, True),
        (PANEL_ELEMENT_NAME, "/local/foreign-panel.js", True),
        (PANEL_ELEMENT_NAME, PANEL_MODULE_URL, False),
    ],
)
async def test_foreign_or_insecure_panel_collision_fails_setup(
    hass: HomeAssistant,
    element_name: str,
    module_url: str,
    require_admin: bool,
) -> None:
    """A colliding panel is neither accepted nor overwritten."""
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=element_name,
        module_url=module_url,
        require_admin=require_admin,
    )
    existing = hass.data[frontend.DATA_PANELS][PANEL_URL_PATH]

    with pytest.raises(ConfigEntryError, match="incompatible panel"):
        await async_register_panel(hass)

    assert hass.data[frontend.DATA_PANELS][PANEL_URL_PATH] is existing


async def test_unregister_panel(hass: HomeAssistant) -> None:
    """Unload removes only the registered panel."""
    with patch.object(frontend, "async_remove_panel") as remove_panel:
        async_unregister_panel(hass)

    remove_panel.assert_called_once_with(
        hass,
        PANEL_URL_PATH,
        warn_if_unknown=False,
    )


def test_module_url_is_content_addressed() -> None:
    """The served module URL carries the exact bundle fingerprint.

    Home Assistant's frontend service worker caches the panel module response,
    so an unchanged URL keeps serving a stale bundle after an update.
    """
    fingerprint = panel_bundle_fingerprint()

    assert fingerprint is not None
    assert fingerprint.isalnum()
    assert panel_module_url() == f"{PANEL_MODULE_URL}?hash={fingerprint}"
    assert panel_module_url().startswith(f"{PANEL_MODULE_URL}?")


def test_module_url_changes_when_bundle_bytes_change(tmp_path: Path) -> None:
    """A different bundle must produce a different module URL."""
    bundle = tmp_path / "panel.js"
    bundle.write_bytes(b"original bundle")
    with patch("custom_components.ai_orchestrator.panel._PANEL_BUNDLE", bundle):
        original = panel_module_url()
        assert panel_module_url() == original
        bundle.write_bytes(b"changed bundle")
        changed = panel_module_url()

    assert changed != original
    fingerprint = hashlib.sha256(b"changed bundle").hexdigest()[
        :PANEL_CACHE_BUST_LENGTH
    ]
    assert changed == f"{PANEL_MODULE_URL}?hash={fingerprint}"


def test_module_url_falls_back_when_bundle_is_unreadable(tmp_path: Path) -> None:
    """An unreadable bundle degrades to the plain URL instead of failing setup."""
    with patch(
        "custom_components.ai_orchestrator.panel._PANEL_BUNDLE",
        tmp_path / "missing.js",
    ):
        assert panel_bundle_fingerprint() is None
        assert panel_module_url() == PANEL_MODULE_URL


async def test_registration_reads_bundle_once_in_executor(hass: HomeAssistant) -> None:
    """Registration and compatibility validation hash off the event-loop thread."""
    event_loop_thread = threading.get_ident()
    read_threads: list[int] = []

    def read_bundle() -> bytes:
        read_threads.append(threading.get_ident())
        return b"executor bundle"

    bundle = Mock(spec=Path)
    bundle.read_bytes.side_effect = read_bundle
    with patch("custom_components.ai_orchestrator.panel._PANEL_BUNDLE", bundle):
        assert await async_register_panel(hass) is True
        assert bundle.read_bytes.call_count == 1
        assert await async_register_panel(hass) is False
        assert bundle.read_bytes.call_count == 2

    assert len(read_threads) == 2
    assert all(thread != event_loop_thread for thread in read_threads)


async def test_unversioned_yaml_fallback_remains_accepted(
    hass: HomeAssistant,
) -> None:
    """The documented YAML fallback cannot know the hash and stays supported."""
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_ELEMENT_NAME,
        sidebar_title=NAME,
        sidebar_icon=PANEL_SIDEBAR_ICON,
        module_url=PANEL_MODULE_URL,
        require_admin=True,
    )
    existing = hass.data[frontend.DATA_PANELS][PANEL_URL_PATH]

    owns_panel = await async_register_panel(hass)

    assert owns_panel is False
    assert hass.data[frontend.DATA_PANELS][PANEL_URL_PATH] is existing
