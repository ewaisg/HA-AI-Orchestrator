# CLD-002 offline Bedrock Converse verification

Status: offline implementation independently approved; live deployment gates remain open.

## Scope and changes

The separately gated adapter implements explicit credential configuration, authenticated foundation-model catalogue testing, Converse text/tool/structured-output codecs, bounded executor ownership, static normalized errors and credential rejection. Streaming remains unavailable, generation capabilities remain unknown, and catalogue authentication does not prove access to a configured model. The adapter is not registered and no cloud workflow route is enabled.

This continuation fixes three defects in the previous draft:

- SDK clients do not provide the context manager used by the draft. Explicit `try/finally` now closes clients after both successful and failed calls.
- A `None` profile instance variable falls through to environment profile lookup in botocore. A session-local constant configuration provider now disables that lookup without changing global process environment.
- Home Assistant's test fixture executes executor jobs synchronously. Cancellation and deadline tests now use an actual executor and prove the worker runs off the event loop, remains the sole occupied request slot after caller cancellation or timeout, and releases the slot when the worker finishes.

SDK tests patch the API call boundary before invocation. All credentials, models, prompts and responses are synthetic; no AWS request occurred.

## Observed verification

Runner: WSL Ubuntu, existing Home Assistant Core 2026.9.3 environment, boto3/botocore 1.42.97 loaded from a separate SDK directory. This is development-host evidence, not Home Assistant Green runtime or ARM64 evidence.

```sh
PYTHONPATH=$HOME/.local/share/ha-ai-orchestrator/bedrock-sdk-14297 \
  $HOME/.local/share/ha-ai-orchestrator/venv-202693/bin/python \
  -m pytest tests/providers -q
```

- Provider suite: **300 passed in 5.24 seconds**.
- Focused Bedrock rerun: **41 passed in 1.75 seconds**.
- Ruff format: two files unchanged; Ruff check: all checks passed.
- Scoped `git diff --check`: passed (adapter and tests remain new files; Ruff separately checked their content).

The first Windows attempt could not collect tests because the Home Assistant test plugin requires Linux `fcntl`; this was an environment failure, not a passing check. The first corrected Linux run found the ambient-profile defect: 39 passed, 1 failed. The recorded final results follow its repair.

SHA-256 of reviewed candidate files:

| File | Hash |
|---|---|
| `custom_components/ai_orchestrator/providers/bedrock_converse.py` | `e73fc547973d695f676980ff60879a55e3b24256aeec8008237fe9859b5c49f4` |
| `tests/providers/test_bedrock_converse.py` | `9308112a7698ceebaeaf6a4b6b8f0525287bf067723632fdd78d2ae312ff202f` |

## Residual gates and resume point

Independent `product_gap_audit` reviewer approved the complete adapter for the **offline, unregistered boundary** with no blocking code findings and reproduced **41 passed in 1.66 seconds**. Before registration, demonstrate that provider replacement/unload cannot accumulate concurrent abandoned executor workers: current ownership is per provider instance.

CLD-002 remains in review. Before registration or deployment, ADR-0003 requires the host SDK footprint/install-time, ARM64 support, memory, event-loop and cancellation transport spike. The SDK requirement is currently only a constant; integration registration and dependency declaration are deliberately unchanged. ENV-006 still tracks unknown account, region, IAM, approved credential method, model/inference-profile and live inference facts. Cloud privacy/routing policy and explicit workflow opt-in remain separate tasks. No supported live model, deployed Bedrock feature or finished cloud acceptance is claimed.

Resume: verify provider replacement/unload worker ownership and the ADR-0003 host transport gate before adding registration/dependency wiring.
