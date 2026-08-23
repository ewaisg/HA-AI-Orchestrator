"""Tests for the AI Orchestrator manifest boundary."""

import json
from pathlib import Path


def test_panel_custom_dependency_precedes_config_entry_setup() -> None:
    """The YAML fallback component is loaded before this integration."""
    manifest_path = (
        Path(__file__).parents[2]
        / "custom_components"
        / "ai_orchestrator"
        / "manifest.json"
    )
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    assert "frontend" in manifest["dependencies"]
    assert "panel_custom" in manifest["dependencies"]
