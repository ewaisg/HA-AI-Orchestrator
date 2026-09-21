"""Bounded live execution of one eligible workflow run (WFL-004).

Only a stored workflow with `run_mode: execute` reaches this module, and only
through the foundation-owned manager after its own deterministic triggers and
conditions passed. A run does exactly this, in order: the AI steps through
`run_ai_steps` (one bounded local provider call each), then each `notify`
step delivers the last composed text through a resolved notify target. The
first failure stops the run. A run never retries a delivery, never replays a
completed side effect, and records only redacted evidence: step statuses,
error codes, counters and timestamps. No message text is retained.
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any, Final

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .providers.contract import Provider
from .workflow_notify import async_send_notification
from .workflow_schema import AI_STEP_KINDS, StepKind, Workflow
from .workflow_steps import (
    STATUS_FAILED,
    STATUS_OK,
    STATUS_PLANNED,
    STATUS_SKIPPED,
    StepContext,
    run_ai_steps,
)

NOTIFY_TIMEOUT_SECONDS: Final = 30
STATUS_DELIVERED: Final = "delivered"

ERROR_NO_PROVIDER: Final = "provider_unavailable"
ERROR_NO_MESSAGE: Final = "no_composed_message"
ERROR_TARGET_MISSING: Final = "notify_target_missing"
ERROR_DELIVERY_FAILED: Final = "delivery_failed"
ERROR_DELIVERY_TIMEOUT: Final = "delivery_timeout"

ProviderLookup = Callable[[str], Provider | None]


def _redact(step: dict[str, Any]) -> dict[str, Any]:
    """Keep only non-content evidence for one step result."""
    return {
        key: value
        for key, value in step.items()
        if key
        in {"index", "step_id", "kind", "executed", "status", "error", "category"}
    }


async def async_execute_workflow(
    hass: HomeAssistant,
    workflow: Workflow,
    context: StepContext,
    provider_lookup: ProviderLookup,
    *,
    now: datetime | None = None,
    run_allowed: Callable[[], bool] | None = None,
    light_executor: Callable[[], Awaitable[dict[str, Any]]] | None = None,
) -> dict[str, Any]:
    """Run AI steps then deliveries; return a redacted execution record."""
    if len(workflow.steps) == 1 and workflow.steps[0].kind.value == "light_control":
        if light_executor is None:
            raise ValueError("Unattended light execution is unavailable")
        return await light_executor()
    started = now or dt_util.utcnow()
    record: dict[str, Any] = {
        "started_at": started.isoformat(),
        "steps": [],
        "provider_calls": 0,
        "actions_executed": 0,
        "completed": False,
        "error": None,
    }
    ai_steps = [step for step in workflow.steps if step.kind in AI_STEP_KINDS]
    provider = (
        provider_lookup(workflow.provider_connection_id)
        if workflow.provider_connection_id is not None
        else None
    )
    if ai_steps and provider is None:
        record["error"] = ERROR_NO_PROVIDER
        record["steps"] = [
            {
                "index": index,
                "step_id": step.step_id,
                "kind": step.kind.value,
                "executed": False,
                "status": STATUS_SKIPPED,
            }
            for index, step in enumerate(workflow.steps)
        ]
        return record

    if provider is not None:
        outcome = await run_ai_steps(workflow, context, provider)
    else:
        outcome = {
            "steps": [
                {
                    "index": index,
                    "step_id": step.step_id,
                    "kind": step.kind.value,
                    "executed": False,
                    "status": STATUS_PLANNED
                    if step.kind is StepKind.NOTIFY
                    else STATUS_SKIPPED,
                    "message_step_id": None,
                }
                for index, step in enumerate(workflow.steps)
            ],
            "provider_calls": 0,
            "actions_executed": 0,
            "completed": True,
        }
    record["provider_calls"] = outcome["provider_calls"]
    composed = {
        step["step_id"]: step["text"]
        for step in outcome["steps"]
        if step["status"] == STATUS_OK and "text" in step
    }
    failed = not outcome["completed"]
    if failed:
        first = next(s for s in outcome["steps"] if s["status"] == STATUS_FAILED)
        record["error"] = first.get("error")
    steps: list[dict[str, Any]] = []
    for step in outcome["steps"]:
        if run_allowed is not None and not run_allowed():
            raise asyncio.CancelledError
        if step["status"] != STATUS_PLANNED or failed:
            steps.append(_redact(step))
            continue
        message = composed.get(step.get("message_step_id") or "")
        if message is None:
            steps.append(
                {**_redact(step), "status": STATUS_FAILED, "error": ERROR_NO_MESSAGE}
            )
            record["error"] = ERROR_NO_MESSAGE
            failed = True
            continue
        reference = next(
            item.notify_service
            for item in workflow.steps
            if item.step_id == step["step_id"]
        )
        try:
            async with asyncio.timeout(NOTIFY_TIMEOUT_SECONDS):
                kind = await async_send_notification(
                    hass, reference or "", message=message, title=workflow.name
                )
        except LookupError:
            steps.append(
                {
                    **_redact(step),
                    "status": STATUS_FAILED,
                    "error": ERROR_TARGET_MISSING,
                }
            )
            record["error"] = ERROR_TARGET_MISSING
            failed = True
            continue
        except TimeoutError:
            steps.append(
                {
                    **_redact(step),
                    "status": STATUS_FAILED,
                    "error": ERROR_DELIVERY_TIMEOUT,
                }
            )
            record["error"] = ERROR_DELIVERY_TIMEOUT
            failed = True
            continue
        except Exception:  # noqa: BLE001 -- service internals stay backend-only
            steps.append(
                {
                    **_redact(step),
                    "status": STATUS_FAILED,
                    "error": ERROR_DELIVERY_FAILED,
                }
            )
            record["error"] = ERROR_DELIVERY_FAILED
            failed = True
            continue
        record["actions_executed"] += 1
        steps.append(
            {
                **_redact(step),
                "status": STATUS_DELIVERED,
                "executed": True,
                "target": kind,
            }
        )
    if failed:
        seen_failure = False
        for step in steps:
            if step["status"] == STATUS_FAILED:
                seen_failure = True
            elif seen_failure and step["status"] in {STATUS_PLANNED, STATUS_SKIPPED}:
                step["status"] = STATUS_SKIPPED
                step.pop("target", None)
    record["steps"] = steps
    record["completed"] = not failed
    record["finished_at"] = dt_util.utcnow().isoformat()
    return record
