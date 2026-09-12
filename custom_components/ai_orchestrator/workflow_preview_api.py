"""Admin-only offline preview transport; never access household state or actions."""

import json
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .runtime import is_foundation_loaded
from .workflow_preview import preview_workflow

WORKFLOW_PREVIEW_WEBSOCKET_TYPE = "ai_orchestrator/workflow/preview"
MAX_PREVIEW_JSON_CHARS = 131_072


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    """Reject ambiguous JSON objects without echoing caller-controlled keys."""
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON keys")
        result[key] = value
    return result


def _reject_constant(_value: str) -> None:
    """Reject nonstandard JSON numbers."""
    raise ValueError("Nonstandard JSON number")


def load_bounded_json(text: str) -> Any:
    """Parse caller JSON strictly: bounded size, unique keys, standard numbers.

    Raises ValueError or RecursionError; callers map both to a static error.
    """
    if len(text) > MAX_PREVIEW_JSON_CHARS:
        raise ValueError("JSON input is too large")
    return json.loads(
        text, object_pairs_hook=_unique_object, parse_constant=_reject_constant
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): WORKFLOW_PREVIEW_WEBSOCKET_TYPE,
                vol.Required("workflow_json"): str,
                vol.Required("snapshot_json"): str,
            }
        )
    )
)
@callback
def websocket_workflow_preview(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Evaluate only supplied inputs and return a bounded, redacted trace."""
    if not is_foundation_loaded(hass):
        connection.send_error(msg["id"], "not_loaded", "The foundation is not loaded.")
        return
    try:
        result = preview_workflow(
            load_bounded_json(msg["workflow_json"]),
            load_bounded_json(msg["snapshot_json"]),
        )
    except ValueError, RecursionError:
        connection.send_error(
            msg["id"], "invalid_preview", "Check the workflow and snapshot JSON."
        )
        return
    connection.send_result(msg["id"], {"schema_version": 1, **result})
