# Documenso

Send Documenso envelopes for signature, manage their recipients and fields, and
read the audit trail behind them.

- **Categories** — legal, documents, productivity
- **Auth methods** — api-key
- **Actions** — 20
- **Egress allowlist** — `app.documenso.com`, `*` (self-hostable — see below)
- **Website** — https://documenso.com
- **API docs** — https://docs.documenso.com/developers ·
  schema: `https://app.documenso.com/api/v2/openapi.json` (served by the app's
  own host)

## Setup

### API Key

1. Documenso → **Settings → API tokens**, and create a token.
2. Leave **Instance URL** blank for the hosted service, or set it to your own
   Documenso.

The key is the **whole `Authorization` header value** — not `Bearer <key>`.

### The 401 you will not get

Measured 2026-08-18, calling the API with **no** `Authorization` header answers
**`400`**, not `401`:

```json
{"message":"Request validation failed",
 "headerErrors":{"issues":[{"code":"invalid_type","expected":"string",
                            "received":"undefined"}]}}
```

The header is a declared *parameter* rather than a security layer in front of
the route, so a missing credential reads as a malformed request. The connection
test says so specifically, because "your key is wrong" and "your key never
arrived" have different fixes.

### Why the allowlist has both a host and a wildcard

Documenso's whole appeal is that you can run it, and most deployments do. The
app calls `app.documenso.com` by default — so that host is named — and allows
anything else because a self-hosted instance lives at an address only its
operator knows.

## Three generations of API, and only one is current

This is the first thing to get right, and the easiest to get wrong:

| Surface | Status |
|---|---|
| **v1** (`/api/v1/*`) | Every operation marked *"deprecated, but will continue to be supported"* — and what most tutorials still show |
| **v2 `/document/*`, `/template/*`** | **52 of v2's 89 operations**, each pointing at the same migration guide |
| **v2 `/envelope/*`** | 31 operations, none deprecated |

This app uses only the envelope model, and a test asserts no action reaches the
other two.

An **envelope** is the unit of signing: it holds the documents, the recipients,
the fields placed on them and the audit trail together. A "document" in the old
model was one envelope with one file, and a **template is an envelope** with
`type: TEMPLATE` — which is why templates turn up in an unfiltered envelope
list, and why `envelope-find` defaults to documents.

## Actions

| Key | Type | Description |
|---|---|---|
| `envelope-find` | read | Envelopes — documents by default, or templates |
| `envelope-get` | read | One envelope, its recipients, fields and documents |
| `envelope-use` | perform | Create a real envelope from a template |
| `envelope-update` | perform | Change a draft's title, folder or signing options |
| `envelope-distribute` | perform | **Send it** — nothing reaches a signer before this |
| `envelope-redistribute` | perform | Re-send to recipients who have not signed |
| `envelope-cancel` | perform | Stop a pending envelope, keeping the record |
| `envelope-duplicate` | perform | Copy an envelope into a new draft |
| `envelope-delete` | perform | Permanently delete, audit trail included |
| `envelope-recipient-add` | perform | Add signers to a draft |
| `envelope-recipient-update` | perform | Correct an address, name or order |
| `envelope-recipient-get` | read | One recipient's own signing state |
| `envelope-recipient-remove` | perform | Remove a recipient and their fields |
| `envelope-field-add` | perform | Place signature and input fields |
| `envelope-field-remove` | perform | Remove a field |
| `envelope-audit-log` | read | Who opened, viewed and signed |
| `envelope-download` | read | A short-lived link to the document |
| `envelope-certificate-download` | read | A link to the signing certificate |
| `folder-list` | read | Folders, and the ids envelopes are filed into |
| `folder-create` | perform | Create a document or template folder |

## Creating something to sign

`POST /envelope/create` takes `multipart/form-data` with a PDF, and an App runs
in a sandbox with no local file to attach — so creating an envelope from scratch
is out of scope, the same call this pack's `dropbox-sign` app makes about its
multipart path.

**`envelope-use` is the route that works.** It fills a template envelope's
recipient placeholders and produces a real envelope. That request is multipart
too, but its `files` part is optional, so this app sends only the JSON `payload`
field and lets the template supply its own PDFs. The `Content-Type` header is
deliberately left to the runtime, because a multipart body needs a boundary a
hand-written header would not have.

It is also the better pattern: the document is authored and versioned in
Documenso rather than assembled by a workflow step.

**Recipients are mapped by the template's numeric placeholder id**, not by role
name or position — each entry needs `{id, email}`. `envelope-get` on the
template shows the ids.

## Four things that go wrong quietly

### 1. Nothing is sent until `envelope-distribute`

Creating an envelope, adding recipients and placing fields are all silent. A
workflow that "sent" a contract without this call has a draft nobody can see.

It is also the point of no return the other way: once distributed, recipients
and fields are fixed. `envelope-use` can do both in one call with **Send
Immediately**, which is convenient and worth being deliberate about — it is the
difference between a draft and a contract in somebody's inbox.

### 2. The envelope's status is not one person's status

It reaches `COMPLETED` only when **every** recipient has signed. A workflow
polling it to find out whether Ada signed waits for the slowest signer;
`envelope-recipient-get` returns her own `signingStatus`, and separately whether
she has even opened it.

### 3. Field positions are percentages, not pixels

`pageX`, `pageY`, `width` and `height` are all 0–100. A pixel coordinate lands
somewhere absurd rather than failing, so `envelope-field-add` rejects a value
over 100 with an error that says why.

Every field also belongs to a **recipient** by numeric id — a signature field
with nobody attached is not a field anyone can fill — and removing a recipient
takes their fields with them.

### 4. Cancel keeps the evidence; delete does not

Cancelling stops a pending envelope and leaves it, with its audit trail, in the
account — which is what "we sent the wrong version" means. Deleting removes
both, and **for a signed document the audit trail is the evidence**: who opened
it, when, from where. A copy of the PDF does not carry it.

`envelope-delete` therefore requires an explicit confirmation and points at
cancel.

## Smaller sharp edges

- **A folder is typed.** It holds documents or templates, not both, and the type
  is fixed at creation — so filing a new document into a template folder is
  refused.
- **Downloads return a short-lived URL**, not bytes, which is what makes them
  usable from a sandbox. A pending envelope downloads what has been signed so
  far, which is rarely what anyone wants.
- **The signing certificate is a separate PDF** from the document, and is not
  included when you download the document — hence its own action. It is the
  record you produce when a signature is disputed.
- **`envelope-redistribute` targets recipients, not the envelope.** Naming none
  re-sends to everyone still outstanding, which on a multi-party contract emails
  people who are waiting their turn.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `instance` | dependency | Is **this connection's** Documenso working? |
| `quota` | quota | How much of the request allowance is left |

`instance` reads `GET /api/health`, which Documenso answers unauthenticated and
unusually informatively — measured 2026-08-18:

```json
{"status":"ok","timestamp":"…",
 "checks":{"database":{"status":"ok"},"certificate":{"status":"ok"}}}
```

**The `certificate` check is the one worth surfacing.** Documenso signs PDFs
with a certificate, and a self-hosted instance supplies its own — an expired or
missing one means *signing fails while everything else looks perfectly
healthy*. Each sub-check is reported as its own component, and a failing one is
`down`.

`quota` reads the rate-limit headers, which Documenso sends on **every**
response including errors (`x-ratelimit-limit: 1000`, `remaining`, `reset`).
They are not declared anywhere in the OpenAPI document, so this reads what
actually arrives and reports `unknown` when nothing does — which is the correct
answer for a self-hosted instance that does not rate limit, not a fault.

> `x-ratelimit-reset` is epoch **seconds** here. This pack's `launchdarkly` app
> reads the same-named header in **milliseconds**. The two are a factor of a
> thousand apart and both look like a plausible timestamp, so each app converts
> explicitly.

## What this app deliberately does not do

- **The deprecated `/document/*` and `/template/*` surfaces**, or v1 at all.
- **Upload PDFs** — `envelope/create`, `envelope/item/create-many` and the
  attachment endpoints all move bytes the sandbox cannot produce.
- **Embedding presign tokens** — they exist to let a browser sign inside your
  own page, a front-end concern rather than a workflow step.
- **Direct links** — a public URL anyone can use to start a signature is a
  sharing decision, not an automation one.

## Errors

Documenso answers a validation failure with a Zod issue tree under `bodyErrors`
or `headerErrors`, naming the exact field — far more useful than the top-level
`message`, so the whole body is surfaced.
