"""Provider-neutral draft transport schema; the workflow parser is authoritative.

The contract supports closed objects, arrays, primitives and enums, not unions.
Variant fields are optional here and checked by the strict per-kind workflow
parser after generation. No unsupported schema keywords or executor are added.
"""

from .providers.contract import StructuredOutputDefinition


def _object(properties: dict, required: list[str]) -> dict:
    return {
        "type": "object",
        "properties": properties,
        "required": required,
        "additionalProperties": False,
    }


def _strings(values: list[str] | None = None) -> dict:
    return {"type": "string", **({"enum": values} if values else {})}


def draft_output_schema(
    entities: list[str], targets: list[str], light_registry_ids: list[str] | None = None
) -> StructuredOutputDefinition:
    """Constrain generation to selected references and existing draft fields."""
    trigger = {
        "kind": _strings(["manual", "time", *(["state"] if entities else [])]),
        "at_time": _strings(),
    }
    condition = {
        "kind": _strings(
            ["time_window", *(["state", "numeric_state"] if entities else [])]
        ),
        "after_time": _strings(),
        "before_time": _strings(),
    }
    if entities:
        trigger.update(
            {
                "entity_ids": {"type": "array", "items": _strings(entities)},
                "to_state": _strings(),
            }
        )
        condition.update(
            {
                "entity_id": _strings(entities),
                "state": _strings(),
                "above": {"type": "number"},
                "below": {"type": "number"},
            }
        )
    step = {
        "step_id": _strings(),
        "kind": _strings(
            [
                "ai_compose",
                "ai_classify",
                "ai_extract",
                "branch",
                *(["notify"] if targets else []),
                *(["light_control"] if light_registry_ids else []),
            ]
        ),
        "prompt": _strings(),
        "categories": {"type": "array", "items": _strings()},
        "fields": {
            "type": "array",
            "items": _object(
                {"name": _strings(), "type": _strings(["string", "number", "boolean"])},
                ["name", "type"],
            ),
        },
        "when_step_id": _strings(),
        "when_category": _strings(),
    }
    if targets:
        step["notify_service"] = _strings(targets)
    if light_registry_ids:
        step["target_registry_id"] = _strings(light_registry_ids)
        step["operation"] = _strings(["turn_on", "turn_off"])
    return StructuredOutputDefinition(
        name="workflow_draft",
        schema=_object(
            {
                "name": _strings(),
                "description": _strings(),
                "triggers": {"type": "array", "items": _object(trigger, ["kind"])},
                "conditions": {"type": "array", "items": _object(condition, ["kind"])},
                "steps": {"type": "array", "items": _object(step, ["step_id", "kind"])},
            },
            ["name", "description", "triggers", "conditions", "steps"],
        ),
    )
