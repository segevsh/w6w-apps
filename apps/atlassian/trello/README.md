# Trello

Manage Trello boards, lists, cards, checklists, labels and members.

- **Categories** — project-management, productivity
- **Auth methods** — api-key
- **Actions** — 27
- **Triggers** — 21 (20 webhook, 1 poll)
- **Egress allowlist** — `api.trello.com`
- **Website** — https://trello.com
- **API docs** — https://developer.atlassian.com/cloud/trello/rest/

## Triggers

| Trigger | Mechanism | Vendor event | What the run gets |
| --- | --- | --- | --- |
| `card-created` | webhook | action `createCard` | card, list and board, and who created it |
| `card-moved` | webhook | action `updateCard` that changes the list | card, the list it left and the list it entered |
| `card-updated` | webhook | action `updateCard` that does not change the list | card and who changed it |
| `comment-added` | webhook | action `commentCard` | the comment text, the card and the commenter |
| `comment-updated` | webhook | action `updateComment` | card, editor and the old and new text (action data) |
| `card-deleted` | webhook | action `deleteCard` | the deleted card, its list and board, and who deleted it |
| `card-member-added` | webhook | action `addMemberToCard` | card, who added them and the new member |
| `list-created` | webhook | action `createList` | list, board and who created it |
| `list-updated` | webhook | action `updateList` | list, what it was before (action data) and who changed it |
| `board-updated` | webhook | action `updateBoard` | board, what it was before (action data) and who changed it |
| `board-member-added` | webhook | action `addMemberToBoard` | board, who added them and the new member |
| `checklist-added` | webhook | action `addChecklistToCard` | card and the checklist (action data) |
| `check-item-created` | webhook | action `createCheckItem` | card, checklist and item (action data) |
| `check-item-state-updated` | webhook | action `updateCheckItemStateOnCard` | card, item and its new state (action data) |
| `label-added-to-card` | webhook | action `addLabelToCard` | card and the label (action data) |
| `label-removed-from-card` | webhook | action `removeLabelFromCard` | card and the label (action data) |
| `label-created` | webhook | action `createLabel` | board and the label (action data) |
| `label-updated` | webhook | action `updateLabel` | board and the label (action data) |
| `label-deleted` | webhook | action `deleteLabel` | board and the label (action data) |
| `any-event` | webhook | the action types you list, or every action | action type, board, list, card, who, and the action data |
| `new-card-in-list` | poll | `GET /lists/{id}/cards`, compared check to check | each card that newly appears in the chosen list |

**Setup.** Set *Board, list or card ID* (a board ID watches every card on it) and paste *Power-Up
secret*: the secret of the Trello Power-Up (API key) that owns the connection's token, shown on its
Trello Auth tab at <https://trello.com/power-ups/admin>. The trigger registers the webhook itself
(`POST /webhooks`) and removes it (`DELETE /webhooks/{id}`) when the subscription is deleted. Trello
probes the callback URL with a HEAD request while creating the webhook; that is answered with no
events.

**Trust model.** Trello signs every delivery: `X-Trello-Webhook` is the base64 HMAC-SHA1 of the raw
request body followed by the callback URL exactly as registered, keyed by the Power-Up secret. A
delivery whose signature does not match is refused and starts no run, and so is a delivery on a
subscription with no secret. Trello's scheme carries no timestamp, so a captured signed delivery
cannot be told from a replay; the callback URL itself is also unguessable. A signed delivery for a
different webhook ID is refused too.

**Any event.** `any-event` takes an optional *Action types* list (comma-separated Trello action
types such as `createList,updateBoard,addMemberToBoard`; blank delivers every action on the
watched model). Trello cannot filter at registration, so the list is applied to each verified
delivery. A board-level webhook sees the board's lists, cards, labels, checklists and members; a
board is only announced as created to a webhook on the member or organization that owns it
(`createBoard`), so use *Any event* with that member's ID for that. Lists are archived, not
deleted, so `list-updated` carries an archive. The action types Trello documents:
<https://developer.atlassian.com/cloud/trello/guides/rest-api/action-types/>.

Events other than the card ones carry the action's own `data` (the label, checklist, check item,
list or board Trello sent, and `old` values for edits) and, for member additions, the member the
action is about.

**New Card In List** is a poll that needs no Power-Up secret: it compares the open cards of one
list from check to check. Trello allows at most 5000 open cards per board
(<https://developer.atlassian.com/cloud/trello/guides/rest-api/limits/>), so a list always fits
one response. A card moved into the list counts as new in it.

**Not covered.** `list-get` returns one list by ID; changes to lists are delivered by
`list-created` and `list-updated`.

Docs, verified 2026-11-10: <https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/>
(signature, HEAD probe), <https://developer.atlassian.com/cloud/trello/guides/rest-api/action-types/>,
<https://developer.atlassian.com/cloud/trello/guides/rest-api/limits/>.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://trello.status.atlassian.com>

```
GET https://trello.status.atlassian.com/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`); `/api/v2/summary.json`
adds per-component detail and open incidents; `/api/v2/components.json` lists the
components on their own. All three are unauthenticated, CORS-enabled and cheap enough to
poll.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The single auth method probes:

```
GET /1/members/me
```

The member behind the key/token pair. n8n instead probes `/1/tokens/{token}/member`,
which puts the credential in the URL path — this avoids that.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint or headers. Trello allows 300 requests per 10 seconds per key and
100 per 10 seconds per token.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `trello.status.atlassian.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

**`quota` is declared absent.** Trello publishes no headroom endpoint or rate-limit headers. The documented allowance is 300 requests per 10 seconds per key and 100 per 10 seconds per token, enforced by 429 rather than reported.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
