# Plaid

Read bank data from a workflow — accounts, balances, transactions, identity and
liabilities — and manage the Items that connect them.

- **Categories** — finance, databases
- **Auth methods** — client-secret, client-secret-sandbox
- **Actions** — 14
- **Egress allowlist** — `sandbox.plaid.com`, `production.plaid.com`
- **Website** — https://plaid.com
- **API docs** — https://plaid.com/docs/api

Paths come from Plaid's reference; the hosts, credential placement and error
taxonomy were verified live on 2026-08-18.

## Everything is a POST, and the credential goes in the body

Plaid takes **no `Authorization` header at all**. Every call is a `POST` whose
JSON body carries `client_id` and `secret` beside the request's own arguments —
verified: omitting them answers
`{"error_code":"INVALID_FIELD","error_message":"client_id must be a properly
formatted, non-empty string"}`.

An Action may never touch a credential, so the pair is injected by the auth
**`sign` hook**, which is the one hook allowed to hold one and the only one that
receives the request body. Actions build a credential-free body and never see
them; a test asserts no action file sets either field.

## Two credentials, and only one of them is this connection

This is the structural thing to understand.

| | Belongs to | Lives where |
|---|---|---|
| `client_id` + `secret` | The **application** | This connection |
| `access_token` | One **Item** — one person's link to one bank | Your data store |

One connection fans out over thousands of Items, so an access token is a
**parameter**, not a connection field. It is also a long-lived secret: anyone
holding one can read that person's balances and transactions until the Item is
removed. Every action that takes one declares it `type: "secret"`, nothing here
logs one, and a test enforces both.

## Setup

1. Plaid Dashboard → **Developers → Keys**.
2. The `client_id` is the same everywhere; the **secret differs per
   environment**. Connect with the sandbox method first.

`development.plaid.com` is deliberately absent: verified 2026-08-18 it fails DNS
resolution rather than answering, because Plaid retired that environment.

The connection test probes `/institutions/get`, which needs no Item — so a
failure can only mean the connection is wrong, and the commonest case (a
production secret against sandbox, or the reverse) gets its own message.

## `transactions/sync`, and why there is no date-range read

Bank transactions are **not immutable**. A pending charge becomes a posted one
with a different amount and a different id; a merchant name is enriched days
later; a transaction is removed entirely.

A date-range read cannot express any of that — it returns what is true *now* for
a window, so a workflow re-reading last week's window sees changes it cannot
distinguish from new data, and double-counts or misses them.

`/transactions/sync` answers the right question: **what changed since this
cursor**. It returns `added`, `modified` and `removed` separately, plus a fresh
cursor. Store the cursor, pass it next run, and the workflow stays correct
through amendments and removals without re-reading anything.

So this app implements sync and **not** `/transactions/get` — a test asserts no
action calls it.

The first sync has no cursor and returns the Item's whole history in pages;
`transaction-sync` follows that `has_more` loop for you, bounded by a page
ceiling. Hitting the ceiling is not a failure — it returns `hasMore: true` and
the cursor to resume from.

## What a workflow cannot do, by design

Connecting a bank account requires a **human in Plaid Link**, choosing their
institution and typing their credentials. Nothing about that can or should be
automated.

What a workflow can do is the two server halves:

1. `link-token-create` — mint the short-lived token the browser needs;
2. `public-token-exchange` — turn what Link returns into an Item's access token.

`sandbox-item-create` is the exception that makes the whole thing testable: in
sandbox only, one call produces a public token with no browser at all, so a
workflow can be exercised end to end against synthetic data. It refuses to run
on a production connection, with the reason.

## Actions

| Key | Type | Description |
|---|---|---|
| `transaction-sync` | read | What changed since a cursor |
| `account-list` | read | Accounts with **cached** balances |
| `balance-get` | read | **Live** balances, fetched from the bank |
| `liabilities-get` | read | Cards, loans and mortgages, with their terms |
| `transaction-refresh` | perform | Force an on-demand fetch (billable) |
| `identity-get` | read | Account holders as the bank has them |
| `auth-get` | read | Account and routing numbers |
| `link-token-create` | perform | The token Plaid Link needs |
| `public-token-exchange` | perform | Public token → access token |
| `sandbox-item-create` | perform | An Item with no browser (sandbox only) |
| `item-get` | read | One connection's health, including its error |
| `webhook-update` | perform | Point an Item's events at a URL |
| `item-remove` | perform | Disconnect a bank permanently |
| `institution-list` | search | Supported banks and their status |

## Things worth knowing

### `ITEM_LOGIN_REQUIRED` is not a transient failure

It means one user's bank credentials have expired. **Retrying will never fix
it** — somebody has to re-authenticate through Plaid Link in *update mode*,
which `link-token-create` supports by taking an existing access token. That
repairs the Item in place, preserving its id and history, where a fresh
connection would produce a new Item that nothing is pointing at.

Treating it as transient is how a sync silently stops working for one customer
while everybody else's keeps flowing. The client names the code and the fix in
its error message, and `item-get` warns when an Item is carrying one.

Plaid's error taxonomy is unusually good and worth branching on: every failure
has an `error_type`, a machine `error_code`, a developer `error_message`, a
customer-safe `display_message`, a `documentation_url` and often a
`suggested_action`. This app surfaces the code, the suggestion, the doc link and
the `request_id` — the last being what Plaid support asks for.

### Cached balance versus live balance

`account-list` answers from Plaid's cache: fast, free of the bank's rate limits,
and possibly **hours** stale. `balance-get` reaches the institution: slower,
subject to *its* rate limits, and the only version safe to make a payment
decision on. Polling the live one on a schedule is the usual mistake.

Neither returns "money" without care. `current` includes pending transactions
and `available` does not — and on a **credit card** `available` is remaining
credit, not funds. Summing across account types without reading `type`/`subtype`
produces a number that looks plausible and means nothing.

### `auth-get` is the most sensitive call here

It returns the actual account and routing numbers — what an ACH debit needs, and
what somebody else's ACH debit would also need. Read it when setting up a
payment, store only what the processor needs, and **never log the response**;
this action logs an account count and nothing else.

`numbers` is split by scheme (`ach`, `eft`, `international`, `bacs`) because a
Canadian account has a transit and institution number rather than a routing
number, so reaching for `ach[0]` on a non-US account finds nothing.

### Identity is what the bank believes

`identity-get` returns the account holder's name, address, email and phone **as
the institution holds them** — not what the user typed into a signup form. That
is what makes a name match evidence rather than an assertion, and it is why it
is the primary tool for verifying that the person opening an account owns it.

`owners` is an array per account: a joint account genuinely has more than one,
and taking `owners[0]` silently picks one of two spouses.

### Refresh does not return data

`transaction-refresh` forces a fetch from the bank and is **billable** on most
plans. Its response is an acknowledgement — the transactions arrive
asynchronously, signalled by the `SYNC_UPDATES_AVAILABLE` webhook. A workflow
that refreshes and immediately syncs will usually see nothing and conclude,
wrongly, that there is nothing there.

Refresh only when a user is *waiting* for something to appear; let the scheduled
refresh cover everything else, and use `webhook-update` rather than polling —
Plaid refreshes a few times a day, so most polls cost a call and return nothing.

### Removing an Item is what "delete my account" should mean

`item-remove` invalidates the access token immediately, ends billing for that
Item, and ends Plaid's access to that person's bank. It requires an explicit
confirmation because reconnecting means the user going through Link again and
producing a **new Item with a new id** — so anything storing the old id will not
follow.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is Plaid's API up? |
| `credentials` | dependency | Are **these** credentials live in **this** environment? |

`service` reads Plaid's status page for the API and Link components. Notably it
does *not* try to summarise institution connectivity: the API being up while a
swathe of banks are unreachable is Plaid's normal failure mode, and it presents
as per-Item errors rather than as an outage. `item-get`'s `error` field is where
that lives.

`credentials` probes `/institutions/get` precisely because it needs **no Item**
— so a failure can only mean the connection is wrong, which separates the two
confusable problems:

| Failure | Means | Fixed by |
|---|---|---|
| `INVALID_API_KEYS` | Wrong secret, usually the other environment's | Reconnecting |
| `ITEM_LOGIN_REQUIRED` | One user's bank login expired | That user, via Link |

Plaid publishes no rate-limit headroom — it meters per client id and per
endpoint, and the ceiling appears only as `RATE_LIMIT_EXCEEDED`, which this
check reports as `degraded`.

## What this app deliberately does not do

- **Money movement** (Transfer, Payment Initiation). Initiating a debit from a
  workflow is a different risk class, with authorisation and reconciliation
  semantics that deserve their own deliberate integration.
- **Income and asset reports.** Asynchronous report jobs whose output is an
  artefact for an underwriter, not a workflow step.
- **Webhook verification.** Verifying Plaid's JWT signature is a receiver
  concern, and belongs to whatever serves the endpoint.
