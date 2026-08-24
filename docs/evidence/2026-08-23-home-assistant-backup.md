# Home Assistant backup evidence — 2026-08-23

## Scope and handling

This record captures redacted live evidence for the backup portion of `FND-007` / `ENV-010`. The Home Assistant backup UI was inspected through the owner's authenticated session while the owner performed the wizard's manual steps. No encryption key, emergency-kit content, private hostname, backup identifier, household data, or account identifier is retained here.

## Live observations

| Evidence ID | Observed result | Method |
|---|---|---|
| HA-BACKUP-001 | Before setup, Home Assistant reported zero automatic backups. Only one older manual backup and one older app-update backup were listed, both on the Home Assistant system | Redacted live Backup overview inspection |
| HA-BACKUP-002 | The setup wizard stated that backups are encrypted, presented an encryption key, and offered an emergency-kit download. The owner was instructed to download the kit, store it outside Home Assistant, and never share the key | Redacted live wizard inspection and operator handoff; key deliberately not retained |
| HA-BACKUP-003 | The live wizard offered a built-in Recommended policy described as backing up everything daily and keeping three backups. The owner explicitly selected Recommended | Redacted live wizard inspection plus direct owner confirmation |
| HA-BACKUP-004 | After selection, the Backup page reported a daily schedule retaining three backups, Home Assistant settings and history included, all apps included, and Home Assistant Cloud enabled as a backup location | Redacted live Backup overview inspection |
| HA-BACKUP-005 | The first automatic backup completed successfully. Home Assistant reported one automatic backup of `87.89 MB`, stored in two locations, with the next automatic backup scheduled for the following day | Redacted live Backup overview inspection |
| HA-BACKUP-006 | No restore was attempted against the live Home Assistant system, and no spare-system restore artifact was supplied | Explicitly bounded observation; no destructive test inferred |

## Official contract checked

- Home Assistant documents the automatic-backup wizard, recommends daily backups, defines retention and included-data choices, and recommends a copy outside the Home Assistant device: <https://www.home-assistant.io/common-tasks/general/>
- Home Assistant documents that the emergency kit contains the encryption material needed to restore an encrypted backup and must be stored safely: <https://www.home-assistant.io/more-info/backup-emergency-kit/>

## Disposition

The automatic-backup portion of `ENV-010` is verified for the observed installation: Home Assistant's Recommended policy is configured and its first encrypted automatic backup completed to two locations, including Home Assistant Cloud. The repository does not contain the encryption key or emergency kit.

The following remain open and are not represented as passed:

1. Owner confirmation that the emergency kit was downloaded and is securely stored outside Home Assistant.
2. A written restore-test policy and a safe restore artifact from a spare or isolated Home Assistant environment; no restore will be attempted on the production installation merely to close Phase 0.
3. Router/VLAN segmentation and access-control facts for the Home Assistant-to-LM Studio path.

## Repository-update verification

| Check | Result |
|---|---|
| `git diff --check` | Passed; only expected Windows line-ending notices were emitted |
| `uv run python scripts/canary_scan.py` | Passed with no findings |
| `uv run python scripts/run_pure_tests.py` | `81 passed`, with five dependency deprecation warnings |
| Targeted sensitive-value scan | No custom domain, observed private address range, Bearer-token pattern, unique chat-completion ID, or observed encryption-key prefix was found in the checked repository paths |
| Independent workflow/safety review | Approved with no blocking findings; confirmed bounded claims, redaction, retained unknowns, and the prohibition on using the production installation merely to close the restore-test item |
