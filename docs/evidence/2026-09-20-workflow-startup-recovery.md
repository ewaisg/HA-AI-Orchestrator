# WFL-008 startup dependency recovery

The live r13 restart exposed an enabled notification workflow with zero listeners and `dry_run_required` while Home Assistant was still loading its entities. The manager previously attempted activation once. Its existing publication binding correctly classified a not-yet-present notify state as missing, which did not match the persisted entity receipt; nothing subsequently retried the activation.

The root agent subsequently observed the original r13 workflow after startup: an explicit Disable then Enable through the panel accepted the unchanged receipt and produced one active listener with zero executions. This supports the startup-retry diagnosis and rules out receipt corruption for this observed workflow. It is evidence about existing r13 behavior after explicit recovery, not deployed acceptance of this patch.

The manager now retains initially enabled executable workflows that could not activate, waits for Home Assistant's started event, and retries every five seconds for at most 60 attempts. For an already running host, the first attempt is five seconds later. Each attempt reads the current stored workflow, requires its provider to be loaded with matching configuration, and requires the original dry-run receipt to match the current provider configuration and target identities. No receipt is renewed or rewritten. Observation workflows keep their existing behavior.

Deleted, disabled and already active workflows leave the recovery queue. The manager skips activation while its mutation lock is held. Stop removes the owned event listener or timer and invalidates callback identity; a late callback from an earlier start cannot affect a subsequent start. Exhaustion leaves the workflow inactive with its existing error until an explicit valid operation or later lifecycle restart.

An unchanged registry-backed notify entity can recover after its state appears. A replaced entity identity, changed provider configuration or legacy notify-service receipt from a different process cannot pass this recovery path. The existing per-execution receipt check remains in place.

## Verification

On the isolated Home Assistant Core 2026.9.3 runner:

```sh
$HOME/.local/share/ha-ai-orchestrator/venv-202693/bin/python -m pytest \
  tests/home_assistant/test_workflow_startup_recovery.py \
  tests/home_assistant/test_workflow_manager.py \
  tests/home_assistant/test_workflow_execution.py \
  tests/home_assistant/test_workflow_publication.py -q
```

**66 passed in 5.54 seconds**, including ten new startup cases covering delayed entities, unloaded provider, changed identities/configuration, legacy process receipts, disabled/deleted workflows, bounded retries, event/timer cleanup, stale callbacks and concurrent mutation lock ownership. Tests assert the persisted receipt is unchanged and startup recovery performs no provider generation.

Scoped Ruff formatting/lint and `git diff --check` passed. Independent reviewer `product_gap_audit` approved this boundary with no blocking findings and reproduced all ten startup tests in 1.11 seconds. A subsequent deployed restart remains required; this evidence does not claim live restart acceptance of the fix. Frozen r13 files were not modified.

The first test iteration correctly exposed that Home Assistant's `is_running` property includes `CoreState.starting`. The implementation now checks exact `CoreState.running`, so startup grace does not begin prematurely during integration setup.
