# r12 manual installation recovery

The owner reported extracting the ZIP into Home Assistant config. Authenticated
Chrome/File editor inspection confirmed the canonical directory
`/homeassistant/custom_components/ai_orchestrator`; no additional upload or
installer run was needed.

A read-only Python command through File editor compared SHA-256 for all 37
integration files against frozen `outputs/r12/identity.json`:

```json
{"expected_files":37,"matched_files":37,"mismatches":[],"canonical_directory":"/homeassistant/custom_components/ai_orchestrator","previous_rollback_exists":true}
```

Before restarting, the agent copied the as-found r12 code and the two relevant
storage files (where present), with storage readback verification, into:

`/homeassistant/.ai-orchestrator-backups/r12-manual-before-restart-hob0qsw3`

This is a **post-manual-copy checkpoint**, not a pre-r12 code rollback.
The older `before-r10-2z2r5mvm` checkpoint was confirmed present and preserved.
No uploaded files were moved or deleted. The first backup command failed at
Python parsing because a single-line form stripped newlines; no mutation began.
The corrected single-line command completed and printed the verified path.

The agent then requested Core restart through File editor's Restart Home
Assistant dialog. Recovery and feature acceptance are recorded below once
observed; submitting the dialog alone is not proof of a successful restart.

## Observed after restart

- The browser showed connection lost/reconnecting, then Core startup progress
  (caldav and reolink), then the AI Orchestrator sidebar entry reappeared.
- The updated panel returned authenticated foundation status, provider available,
  and **Conversation agent: Available**. This is platform registration evidence,
  not completion of an owner-selected Assist voice pipeline test.
- Entities & Permissions rendered the new agent scope editor with **0 of 64
  selected**. No scope was granted or saved by the agent.
- Clicking **Test tool support** completed with **Tool call and continuation
  verified for this local connection.** The probe used synthetic data only;
  no household state was read and no device action was available.
- Ordinary Chat was given `Reply with exactly: Local chat is working.` and
  returned `Local chat is working.` through the existing local connection.
- No login, second upload, installer execution, cache clearing, or manual user
  intervention was needed in this recovery turn. Installation guidance now
  clearly distinguishes manual extraction from the alternative installer method.

The live r12 installation and these smoke checks are complete. WFL-007 still
needs the owner's window and notification destination; real observation scope
selection and Assist voice-pipeline acceptance remain unperformed. This does
not close the entire roadmap or the outstanding release gates.
