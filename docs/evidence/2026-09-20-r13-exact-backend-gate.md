# r13 exact backend gate

The independent test/release subagent extracted the frozen
`outputs/r13/candidate.tar` into a separate Linux directory:
`/home/gewais/.local/share/ha-ai-orchestrator/r13-exact-b42130b5`.
The test environment was the repository's named Home Assistant Core 2026.9.3
virtual environment, Python 3.14.5. `PYTHONPATH` was explicitly unset to prevent
imports from the working repository or the separate Bedrock SDK directory.

Verified identities:

- Deployment ZIP SHA-256:
  `e402e5dd3d50cac691c7da335ec2018d8027ab84afc72fda1daa91db7931e5f7`.
- Source/test archive SHA-256:
  `b42130b5306c6d46e46055048c7154777add92b2c544452a63b5d774455a7d98`.
- All **44 ZIP files** matched the isolated test tree byte for byte, independently
  read through Python's ZIP API after the tests: **zero mismatches**.

The first isolated run passed 1109 tests and failed one historical traceability
manifest check because `.gitattributes` was absent from the test archive. That
noncode fixture was copied from the repository; the test verifies its exact
hash against the frozen historical manifest. Neither ZIP nor archive nor any
integration/test code was changed.

The full repeated isolated command was:

```text
env -u PYTHONPATH /home/gewais/.local/share/ha-ai-orchestrator/venv-202693/bin/python -m pytest tests -q --tb=short
1110 passed in 17.51s
```

Complete passing output: `artifacts/r13/backend-exact.log`.

The broader current working tree was separately tested with the isolated
`bedrock-sdk-14297` import path (boto3 and botocore versions independently printed
as 1.42.97). Result: **1153 passed in 312.67 seconds**. The mounted repository's
artifact scan was much slower than the isolated release tree. Complete output:
`artifacts/r13/backend-current.log`. This larger run includes the 43 draft
Bedrock tests and does not put that adapter into the deployment ZIP.

The unregistered Bedrock adapter and its 43 tests are intentionally outside this
deployment artifact. These tests do not claim real provider account validation,
live installation, device action delivery, handset reception, or broad Home
Assistant version compatibility. Runtime/UI deployment and harmless live
acceptance are separate release gates owned by the primary agent.
