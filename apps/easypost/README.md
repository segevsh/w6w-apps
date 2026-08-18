# EasyPost

Rate a parcel across every carrier, buy the label, track it to the door, verify
addresses before they cost a return, and insure what matters.

- **Categories** — commerce, developer-tools
- **Auth methods** — api-key
- **Actions** — 19
- **Egress allowlist** — `api.easypost.com` (the `service` health check adds
  `www.easypoststatus.com`)
- **Website** — https://www.easypost.com
- **API docs** — https://docs.easypost.com/docs

EasyPost publishes no OpenAPI document, so this app was built against
**EasyPost's own Node SDK** (`github.com/EasyPost/easypost-node`,
`src/services/*.js`), which is the authoritative statement of the surface, and
probed live on 2026-08-18.

> **On categories.** Shipping has no slug in the controlled vocabulary
> (`core/rfcs/categories.md`), so this app is filed under `commerce` and
> `developer-tools`. See *A note on the vocabulary* at the end.

## Setup

### API Key

EasyPost Dashboard → **API Keys**. It is sent as HTTP Basic with **the key as
the username and an empty password** — a trailing colon with nothing after it.

### Test keys produce labels that are not postage

This is the thing to be careful about, because it fails by succeeding.

A test key creates shipments, returns plausible rates, and produces a label with
a `label_url` you can open and print. **None of it is real**: the label is not
valid postage, no carrier has been told anything, and nothing is charged.

**Nothing in a shipment's own response says which kind of key made it.** So the
connection test reports the environment in plain words, and the `account` health
check reports a test key as `degraded` — not because test keys are bad, but
because "we shipped two hundred orders" and "we produced two hundred worthless
PNGs" are otherwise the same log line.

## Shipping is two steps, and only the second costs money

Everything here is built around this:

1. **`shipment-create`** — two addresses and a parcel. EasyPost answers with a
   `rates` array: every carrier and service that will carry it, priced. Nothing
   is bought and nothing is owed.
2. **`shipment-buy`** — *now* money moves, a label exists, and a tracking code
   is issued.

They are separate actions on purpose. A workflow that quotes and a workflow that
spends should not be the same step.

**EasyPost supports a "one-call buy"** — include a `service` in the *creation*
request and it purchases immediately. That is convenient for a human and a trap
in a workflow, so `shipment-create` does not accept it. A test asserts the
parameter is absent.

## Actions

| Key | Type | Description |
|---|---|---|
| `shipment-create` | perform | **Rate a parcel** — buys nothing |
| `shipment-buy` | perform | **Purchase the label** — money moves here |
| `shipment-get` | read | One shipment, before or after purchase |
| `shipment-list` | read | Recent shipments, incl. quotes never bought |
| `shipment-refund` | perform | Ask the carrier for the postage back |
| `shipment-label-format` | read | Re-render as ZPL, EPL2 or PDF |
| `address-verify` | perform | **Check an address before it costs a return** |
| `address-create` | perform | Store a trusted address for reuse |
| `parcel-create` | perform | Describe a box once and reuse its id |
| `tracker-create` | perform | Track a parcel EasyPost did not ship |
| `tracker-get` | read | Where it is, and whether it needs attention |
| `tracker-list` | read | Parcels in flight, statuses tallied |
| `insurance-create` | perform | Insure a parcel shipped elsewhere |
| `carrier-account-list` | read | Which carriers this account can rate against |
| `scan-form-create` | perform | One barcode for a whole batch |
| `pickup-create` | perform | Quote a collection |
| `pickup-buy` | perform | Book it — sends a driver |
| `pickup-cancel` | perform | Call the driver off |
| `event-list` | read | What EasyPost emitted, webhook or not |

## Seven things that go wrong quietly

### 1. Rates are strings, and sorting them lexically buys the wrong label

`rate` comes back as `"9.99"`, not `9.99`. Compared as strings, `"9.99"` sorts
*above* `"10.05"` — so a workflow picking "the first one" after a naïve sort
buys a more expensive label, forever, and nobody notices.

Every action here sorts numerically and `shipment-create` returns
`cheapestRate` separately so the comparison never has to be written twice.

### 2. Weight is ounces and dimensions are inches — and nothing checks

Passing kilograms and centimetres is not rejected. It rates a very small, very
light parcel, quotes a cheap price, and the carrier **rebills the real weight**
weeks later. That adjustment is the most common surprise on a shipping invoice.

### 3. An empty `rates` array is usually a missing carrier account

The most confusing outcome in the API: a shipment that rates against nothing
looks like a bad address and is almost always no carrier account for that route.
EasyPost gives every account default USPS access and nothing else until carriers
are added — `carrier-account-list` is the answer, and it reports the count
because **rating considers at most 60 accounts and silently uses the first
sixty**.

`shipment-create` warns when rates come back empty rather than returning an
empty array and moving on.

### 4. A refund is a request, not a reversal

"Refund" sounds final and is not. EasyPost asks the carrier, the carrier
decides, and the answer arrives over days — `refund_status` moves through
`submitted` to `refunded` or `rejected`. A carrier will reject a refund for a
label that was scanned, reasonably, since it was used.

So `shipment-refund` returns `pending` rather than implying success. The right
time to call it is as soon as an order is cancelled, before the parcel is handed
over.

### 5. `unknown` tracking does not mean lost

The statuses are `unknown`, `pre_transit`, `in_transit`, `out_for_delivery`,
`delivered`, `available_for_pickup`, `return_to_sender`, `failure`, `cancelled`.

**`unknown` means the carrier has not scanned it yet**, which is normal until
the parcel is handed over. A workflow that alerts on `unknown` alerts on every
shipment it creates.

The two worth acting on are **`return_to_sender`** (it is coming back and the
customer does not know) and **`failure`** (the carrier has given up). Both are
otherwise silent — nobody is told, and the order simply never arrives.
`tracker-get` returns `needsAttention` for exactly those two, and computes
`stalled` from the last scan, because no status says "stuck".

### 6. A label bought and never handed over costs money and reports nothing

It sits at `pre_transit` indefinitely. `tracker-list` tallies the statuses so it
shows up, and `shipment-list` filtered to **unpurchased** finds the other half —
quotes abandoned by a cancelled checkout.

### 7. Residential surcharges apply whether or not you declare them

Carriers charge more to deliver to a house. Not marking an address
`residential` does not avoid the surcharge — it just means it arrives as an
invoice adjustment weeks later instead of appearing in the quote.

## Address verification is the cheapest step in the pipeline

A wrong address is not caught at purchase. The label is bought, the parcel
moves, and days later it comes back — postage spent, customer waiting, return to
process.

`address-verify` costs one call and happens before any of that. It also
**corrects**: the response is the address as the postal service holds it, with
standardised abbreviations and the full ZIP+4 rather than the five digits
somebody typed — and carriers rate on that, so a mismatched ZIP can change the
price. The action reports `changed` when the corrected version differs, which is
worth showing a human before it goes on a parcel.

A failure is a result rather than an exception: `verified: false` with the
reasons and EasyPost's suggested correction, not a thrown error.

`address-create` is the deliberate counterpart for addresses you already trust —
your own warehouse — because a customer's address came from a form and should
always be verified, while your loading bay should not need re-verifying for the
rest of the company's life.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is EasyPost up — and **which carriers are**? |
| `account` | dependency | Does this account work, and is it test or production? |
| `quota` | quota | Declared absence — see below |

### The status page is not where you would look for it

Verified 2026-08-18, and worth writing down because it is a trap:
**`status.easypost.com/api/v2/summary.json` answers HTTP 200 with a megabyte of
HTML.** It is not a Statuspage API, and a client that trusts the status code
parses a web page as JSON. The real instance is **`www.easypoststatus.com`** —
page id `n1jtz5983249`, 43 components.

### A carrier outage is not an EasyPost outage, and it is more actionable

The page lists EasyPost's own services — `API`, `Webhooks`, `Tracking`,
`Address Verification`, `Label Purchases` — alongside about twenty-five
**carriers**: USPS, UPS, FedEx, DHL Express, Canada Post, Royal Mail, Amazon
Shipping and the rest.

When FedEx is down, EasyPost's API answers perfectly. You simply cannot buy a
FedEx label. Rolling those together would report an outage that is not one;
ignoring them would hide the reason a purchase is failing. So EasyPost's own
services decide the verdict and **the affected carriers are named in the
message** — "UPS is down, buy the FedEx rate" is something a workflow can act
on, which is rare for a status check.

### `quota` is a declared absence, and the reason is the interesting part

EasyPost's documented limit is **five requests per second across index
endpoints** — a **burst** limit, which has no headroom to report. There is no
balance being consumed and no window to be part-way through, so "how much is
left" is not a question the limit answers. EasyPost publishes no usage endpoint
and documents no `Retry-After` or `X-RateLimit-*` header.

That burst limit is also why the list actions fetch **one page** rather than
walking: a paging loop over a busy account is the fastest way to a `429`.

**Account balance is a different thing and does deplete**, so it is read by the
`account` check instead — running out stops label purchases while the API keeps
answering.

## What this app deliberately does not do

- **One-call buy.** See above: a step named "create" must not spend money.
- **Batches.** EasyPost's batch API is an asynchronous job with its own state
  machine and completion webhook — a different shape from a workflow step, and
  `scan-form-create` covers the common reason people reach for it.
- **Manage carrier accounts.** Adding one means handing EasyPost your negotiated
  credentials with that carrier, which is a deliberate act for a person in a
  dashboard, not a workflow.
- **Webhook configuration.** `event-list` covers the same ground for a workflow,
  and recoverably.
- **Users and sub-accounts.** The white-label and referral surfaces are for
  platforms reselling EasyPost, not for shipping parcels.

## Errors

EasyPost answers `{"error": {"code", "message", "errors": [...]}}`, and the
nested array names the offending **field** with a suggested correction — which
on an address or a parcel is almost always the real problem, so it is surfaced.
A `401` mentions deactivated keys, since a key that exists and has been switched
off reads exactly like a wrong one. A `429` says the limit is a burst and that
spacing calls out fixes it, rather than implying a quota that refills tomorrow.

## A note on the vocabulary

`core/rfcs/categories.md` has no slug for shipping or logistics, so this app
uses `commerce` and `developer-tools`. Two observations, left here rather than
acted on:

- The pack has fourteen `commerce` apps and, before this one, nothing that could
  ship a parcel. If more fulfilment apps arrive, rule 4 of that RFC — "if `other`
  is being used widely for a single concept, that concept earns its own slug" —
  is the argument for adding `logistics`.
- The RFC's rule 5 says an out-of-vocabulary category "SHOULD log a warning",
  while `_tools/audit.ts` treats it as a hard **error**. The tool is stricter
  than the spec it enforces.
