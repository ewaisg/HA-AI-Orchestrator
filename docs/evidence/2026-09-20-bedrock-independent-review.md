# CLD-002 independent offline review

Reviewed the complete unregistered `providers/bedrock_converse.py` adapter and
`tests/providers/test_bedrock_converse.py` on 2026-09-20. No blocking finding for
the offline, unregistered adapter boundary.

Verified explicit credential configuration, disabled ambient profile fallback,
fixed regional AWS endpoints, no configured proxy/endpoint overrides, TLS
verification, one SDK attempt, client closure in `finally`, cancellation shielding
with retained per-instance worker ownership, static error mapping, and rejection
of credential material in provider inputs and outputs. Request/result translation
uses the existing provider contract and performs no tool execution.

Independent command: Core 2026.9.3 virtual environment, isolated boto3/botocore
1.42.97 directory on `PYTHONPATH`, `python -m pytest
tests/providers/test_bedrock_converse.py -q`: **41 passed in 1.66s**. Tests stub SDK
network operations; no AWS request or account authorization occurred.

This is not registration or release approval. Before integration, verify worker
ownership across provider replacement/unload: the current busy slot belongs to
one adapter instance. Live IAM/model access, generation capabilities, installed
Home Assistant Green dependency footprint and memory impact remain unverified.
The adapter remains excluded from cloud routing and the manifest dependency set.

## Follow-up: shared worker ownership

The adapter now owns a shared worker gate passed to every created provider
instance. Replacement credentials and cancelled/timed-out callers cannot bypass
an outstanding worker by creating another instance through that adapter. The
worker await uses `asyncio.wait`, avoiding Home Assistant's shield wrapper logging
an abandoned raw exception; the done callback consumes eventual worker errors.

Independently reviewed this follow-up and reran the same focused command:
**43 passed in 2.00s**. No blocking finding for this lifecycle repair. The earlier
per-instance worker concern is resolved within one registered adapter lifetime.
Actual registration, complete integration lifecycle verification, and the live
host/account/SDK acceptance boundaries remain separate gates.
