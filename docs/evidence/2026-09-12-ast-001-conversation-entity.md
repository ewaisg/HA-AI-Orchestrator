# AST-001 — Assist conversation entity (text-only)

Date: 2026-09-12
Task: AST-001 (Phase 3). Owner: primary agent.
Status after this record: `REVIEW` — implementation and automated evidence complete;
live acceptance on the owner's instance and an independent review remain.

## Dependency note

AST-001 depends on WFL-008, which is open because WFL-007 waits on owner input
(ENV-004). The owner directed on 2026-09-12 to keep building running features
while the open live items stay open, the same basis used for WFL-002. Nothing
here is marked `DONE`, and the entity ships behind the same bound as the rest of
Phase 2 work: it is real, but its gate is not closed.

## What was built

A `conversation` entity platform (`custom_components/ai_orchestrator/conversation.py`).
Each loaded provider connection whose adapter declares `ChatDestination.LOCAL`
forwards the platform and adds exactly one conversation entity, named after the
config entry, with unique id `<connection_id>_conversation`.

The entity answers with model text only:

- The provider request is the integration's own system instruction plus the
  bounded user/assistant turns of the current Home Assistant chat log. No entity
  state, area, device, registry or configuration data is added.
- No Home Assistant LLM API is provided, so `chat_log.llm_api` stays `None` and
  no tool can be offered to the model. The entity declares
  `ConversationEntityFeature(0)`, so it is never presented as a device-control
  agent. If a chat log ever arrives with an LLM API attached, the entity refuses
  the turn rather than answering into it.
- One generation per entity at a time, a 60-second deadline, no retries.
  Responses carrying tool calls or structured output, empty text, or text over
  2,000 UTF-16 units are refused and are not written to the chat log.
- Provider failures answer with the contract's safe message text. Adapter
  strings and configuration never reach the response.
- An in-flight generation is cancelled when the entity is removed, which is what
  a provider-entry unload does.

Supporting changes: `text_length` became public in `chat.py` (shared bound),
`runtime.conversation_entry_ids` records which entries forwarded the platform,
`ai_orchestrator/status` now reports `features.conversation` from that set
instead of a constant `false`, the manifest depends on `conversation`, and the
panel's Voice section describes the agent and where to select it once the
backend reports one.

`tests/home_assistant/conftest.py` now sets up the core `homeassistant`
component for every Home Assistant test, because the `conversation` component
reads that component's exposed-entity store; a real instance always has it.

## Verification

Backend, run from an LF-normalized snapshot of the working tree in WSL:

| Core | Result |
|---|---|
| 2026.8.3 | 729 passed |
| 2026.9.0 | 729 passed |
| 2026.9.2 | 729 passed |

Logs: `artifacts/ast-001/backend-venv-2026{83,90,92}.log` (gitignored).
`scripts/canary_scan.py` exits 0. Ruff check and Ruff format both clean.
Pure suite: 437 passed. Frontend: 245 browser tests, lint, typecheck, build,
sync and byte identity; bundle 169,952 bytes, SHA-256
`74dc606982145c7b0f6cfbd7d16a16720bb2e8c3bcf7dd2d0863090d80aed3b2`.

16 of the backend tests are new (`tests/home_assistant/test_conversation_entity.py`),
driven through Home Assistant's own `conversation.async_converse` and the real
config-entry manager, not through the entity's internals.

### Mutation checks

Each mutation was applied to the snapshot, the suite rerun, and the mutation
reverted:

| Mutation | Caught by |
|---|---|
| Busy guard removed | `test_a_second_sentence_while_generating_is_refused` |
| Tool calls and structured output accepted | `test_unusable_replies_are_refused_and_not_remembered` |
| `ConversationEntityFeature.CONTROL` declared | `test_agent_is_not_offered_as_a_device_control_agent` |
| Entity ids injected into the prompt | `test_separate_conversations_do_not_share_history` |
| History dropped to the current sentence | `test_following_turn_carries_the_previous_turns_only` |

## What is not claimed

- No live acceptance yet: the agent has not been attached to an Assist pipeline
  on the owner's instance, and no live voice pipeline has been exercised. The
  tracker's required evidence for AST-001 includes a selected voice pipeline.
- No independent review of this change.
- Assist's own agent still handles device commands. This entity cannot execute
  anything; per-agent scopes and tool calling remain AST-002 and AST-003.
