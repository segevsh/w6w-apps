# Authorize.Net

- **Triggers** — 1 (poll)

## Triggers

| Key — title | Mechanism | Wrapped action | What the run gets |
| --- | --- | --- | --- |
| `new-customer-transaction` — New Customer Transaction | poll | `list-customer-transactions` sorted by `submitTimeUTC` descending | Each new transaction for the selected customer profile |

Vendor reference: https://developer.authorize.net/api/reference/index.html (verified 2026-11-09).

`io.w6w.authorize-net` provides 40 actions for Authorize.Net's JSON API. The connection uses an
API Login ID and Transaction Key and selects either **sandbox** (the default) or **production**.

## Connection

In the Authorize.Net Merchant Interface, open **Account → Settings → API Credentials & Keys**.
Supply the API Login ID, Transaction Key and matching environment. Sandbox and production are
separate accounts. Connecting runs the read-only `authenticateTestRequest` operation.

Actions receive only the environment in the connection's public display metadata. The isolated
`sign` hook adds `merchantAuthentication`; it refuses an endpoint that does not match the
credential's environment. There is no arbitrary URL or caller-supplied authentication parameter.

## JSON order is enforced, recursively

Authorize.Net translates JSON to XML, so ordinary JSON object key equivalence is insufficient.
This app rebuilds each request in the exact sequence declared by the vendor's XSD:

1. `merchantAuthentication`, then optional `clientId`/`refId`, then the operation's fields.
2. Inherited type fields before the derived type's fields.
3. The same ordering inside every nested object and every item in an array.

The signing hook canonicalizes the **final body after authentication is injected**. Appending
credentials to an already-built object would put them last and cause a schema error.
Array item order is preserved. Decimal strings, `false`, zero and empty nested strings are
preserved. JSON-encoded `settingValue` strings are left intact. Unknown fields are rejected with
their path instead of being silently dropped or appended in an undefined position. Mutually
exclusive payment choices are checked. This handles ordering and basic shapes; Authorize.Net
still validates required business fields, date ranges, account capabilities and processor rules.

`schemas/AnetApiSchema.xsd` is the vendor schema downloaded on **2026-11-05**.
`lib/schema.ts` records its SHA-256 and contains only the request types this app supports and their
reachable nested types. To regenerate after reviewing an updated schema:

```sh
python3 scripts/generate-schema.py
deno fmt lib/schema.ts
```

Do not alphabetically sort field arrays. Do not bypass `orderedRequest` with raw JSON passthrough.
Adding a new field requires updating the schema snapshot and regenerating the ordering table.

## Actions

| Resource | Action keys |
| --- | --- |
| Payments | `charge-payment`, `authorize-payment`, `capture-payment`, `refund-payment`, `void-payment`, `create-transaction` |
| Transactions | `get-transaction`, `list-batch-transactions`, `list-unsettled-transactions`, `list-customer-transactions`, `update-held-transaction` |
| Settlement batches | `get-batch-statistics`, `list-settled-batches` |
| Customer profiles | `create-customer-profile`, `create-profile-from-transaction`, `get-customer-profile`, `list-customer-profile-ids`, `update-customer-profile`, `delete-customer-profile` |
| Payment profiles | `create-payment-profile`, `get-payment-profile`, `list-payment-profiles`, `update-payment-profile`, `delete-payment-profile`, `validate-payment-profile` |
| Shipping addresses | `create-shipping-address`, `get-shipping-address`, `update-shipping-address`, `delete-shipping-address` |
| Subscriptions | `create-subscription`, `update-subscription`, `cancel-subscription`, `get-subscription`, `get-subscription-status`, `list-subscriptions` |
| Hosted forms | `get-hosted-payment-page`, `get-hosted-profile-page` |
| Merchant | `get-merchant-details` |
| Account Updater | `get-account-updater-summary`, `get-account-updater-details` |

Nested API objects use JSON fields, with supported fields described in the action form. They can
be supplied in any key order. IDs are strings. Amounts should be decimal strings to preserve
precision. Documented numeric and boolean strings in JSON objects are accepted alongside native
JSON numbers and booleans.

Charge an Accept.js token with `charge-payment`:

```json
{
  "amount": "10.50",
  "payment": {
    "opaqueData": {
      "dataValue": "TOKEN_FROM_ACCEPT_JS",
      "dataDescriptor": "COMMON.ACCEPT.INAPP.PAYMENT"
    }
  },
  "additionalFields": {
    "order": { "description": "Order 123", "invoiceNumber": "INV-123" }
  },
  "refId": "order-123"
}
```

For a saved profile, replace `payment` with:

```json
{
  "profile": {
    "customerProfileId": "123",
    "paymentProfile": { "paymentProfileId": "456" }
  }
}
```

Use `create-transaction` with a complete `transactionRequest` object for additional transaction
types and advanced API fields. For subscriptions, provide the vendor's `subscription` object;
for profile updates, include the relevant ID **inside** `profile`, `paymentProfile` or `address`.

## Payment results and retries

Actions return the vendor response envelope. Inspect `transactionResponse.responseCode`:
`1` means approved; `4` means held for review. Held transactions are returned intact so callers
can handle review explicitly. Declines (`2`), transaction errors (`3`), API `resultCode: Error`,
HTTP errors and invalid responses raise errors. Errors expose vendor codes and, for a transaction
error, its ID, without echoing raw request/response text into logs.

Payment writes are declared `idempotent: false`, and the client never retries automatically.
**`refId` is correlation only, not an idempotency key.** If a payment times out, reconcile it using
the transaction reporting actions before submitting another charge. `duplicateWindow` is a
vendor transaction setting, not a replacement for reconciliation.

Capture acts on an existing authorization; omit its amount for a full capture. Void applies before
settlement. Refund applies after settlement and needs payment details; card refunds use the last
four card digits and `expirationDate: "XXXX"`. Profile validation in `liveMode` can create a small
authorization. Account Updater operations require that service to be enabled on the merchant.

## Pagination and hosted forms

List actions return one page. Where `paging` is available, use `{"limit":100,"offset":1}`;
**offset is a one-based page number**, not an item count. Follow `totalNumInResultSet` and the
returned page. Settlement date ranges cannot exceed 31 days.

Hosted actions return a `token`. Submit it to the environment's vendor-hosted form in your client:

| Form | Sandbox | Production |
| --- | --- | --- |
| Accept Hosted payment | `https://test.authorize.net/payment/payment` | `https://accept.authorize.net/payment/payment` |
| Hosted profile management | `https://test.authorize.net/customer/manage` | `https://accept.authorize.net/customer/manage` |

The app does not open a checkout page, tokenize cards in a browser, or expose webhook triggers.
Accept.js and webhook ingestion are separate vendor interfaces.

## Health and verification

- `service`: the public Authorize.Net Statuspage JSON feed, unsigned and scoped to its own host.
- `auth:api-credentials`: the connection's read-only authentication test, checking the API body.
- `quota`: informational/unavailable; the API reference exposes no remaining-headroom endpoint.

```sh
deno task test
deno task check
deno task lint
npm test                 # Node 24, matching the pack's CI
npm run build
# From the pack root:
deno run --no-check --no-lock -A _tools/audit.ts authorize-net
```

Tests include each action, credential isolation, environment routing, HTTP-200 API failures,
declines, held transactions, BOM-prefixed responses, and exact serialized key order. The fixture
requests come from the vendor's API reference, with authentication replaced by synthetic values.
Tests deliberately reverse every object's keys before invoking the action and its signing hook.

A read-only sandbox probe on 2026-11-05 confirmed that an ordered transaction-details request with
intentionally invalid credentials reaches authentication (`E00007`); the same request with its
fields reversed fails schema validation first (`E00003`). No charge or other financial write was
sent. Successful merchant transactions require validation with the user's sandbox account.

## Sources

- [API reference and JSON ordering requirement](https://developer.authorize.net/api/reference/index.html)
- [Official XML schema](https://api.authorize.net/xml/v1/schema/AnetApiSchema.xsd)
- [Official Node SDK contracts](https://github.com/AuthorizeNet/sdk-node/blob/master/lib/apicontracts.js)
- [Accept Hosted](https://developer.authorize.net/api/reference/features/accept-hosted.html)
- [Customer profiles and hosted forms](https://developer.authorize.net/api/reference/features/customer-profiles.html)
- [Status feed](https://status.authorize.net/api/v2/status.json)

The icon is the vendor's published favicon from its developer site, copied without modification.
