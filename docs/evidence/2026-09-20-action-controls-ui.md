# AST-004 explicit action controls UI

Implemented `action-client.ts`, `action-controls-view.ts`, and focused browser/client tests. The component offers separate `permissions` and `control` modes for the panel to place in Entities & Permissions and Chat.

Administrators select a local provider, discover actual eligible tools and targets, and save exact versioned grants. Clearing all grants revokes them on save. Control mode accepts either a direct action/target/optional bounded volume or a natural-language request for the local AI to interpret into one permitted proposal. The AI path sends the request and granted target identifiers/names; the component does not send current device state. Both paths display the exact returned entity, action, arguments, current state and risk, and require a distinct human confirmation button.

The confirmation token is never displayed. The card is consumed before sending confirmation and never automatically retried. Unknown or failed outcomes tell the owner to inspect the device; a successful Home Assistant service response is not presented as proof of a physical change. Editing the request, target, action or grants clears the card; disconnect, account change and detachment clear private state and invalidate late responses. Proposals expire locally after five minutes and remain subject to authoritative backend checks.

Every transport result uses a closed parser. Unknown keys, invented tools, excessive/duplicate grants, changed target/arguments/risk, foreign provider/request identities and inconsistent execution statuses are rejected. AI proposals are checked against both the discovered catalog and saved grants before becoming confirmable.

## Observed checks

- Focused Chromium browser/client suite: **13 passed**, including duplicate save/propose/confirm suppression, explicit AI proposal without automatic confirmation, out-of-scope AI rejection, exact volume, revocation, account/disconnect clearing, static failure messages and no retry.
- WCAG 2 A/AA and 2.1 AA axe scan of the volume confirmation view: zero violations.
- 390px component width check: passed without horizontal overflow.
- TypeScript check passed; scoped ESLint passed with zero warnings.

These are synthetic browser tests. Independent security review, whole-panel wiring/build checks, live action grant/confirmation acceptance and the owner-approved risk matrix remain release gates. Backend service calls and physical effects are not claimed by this evidence.
