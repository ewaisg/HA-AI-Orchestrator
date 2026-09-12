"""Every abort reason the config flow can produce must have a translation."""

from __future__ import annotations

import json
import re
from pathlib import Path

COMPONENT = Path(__file__).parents[2] / "custom_components" / "ai_orchestrator"

# Home Assistant's async_update_reload_and_abort defaults to these reasons for
# reauth and reconfigure flows; they are not spelled out in config_flow.py.
IMPLICIT_ABORT_REASONS = {"reauth_successful", "reconfigure_successful"}


def test_config_flow_abort_reasons_are_translated() -> None:
    source = (COMPONENT / "config_flow.py").read_text(encoding="utf-8")
    explicit = set(re.findall(r'async_abort\(reason="([a-z_]+)"\)', source))
    assert explicit, "expected explicit abort reasons in config_flow.py"
    assert "async_update_reload_and_abort(" in source

    translations = json.loads(
        (COMPONENT / "translations" / "en.json").read_text(encoding="utf-8")
    )
    translated = set(translations["config"]["abort"])
    missing = (explicit | IMPLICIT_ABORT_REASONS) - translated
    assert not missing, f"untranslated abort reasons: {sorted(missing)}"
    assert all(translations["config"]["abort"][key].strip() for key in translated)
