# Paystack

Take and reconcile Paystack payments from a workflow: start a checkout, verify the result by
reference, manage customers, plans and subscriptions, create transfer recipients, send payouts, issue
refunds, and read banks and balances. Built on the REST API (`https://api.paystack.co`), verified
2026-10-06 against the vendor's own OpenAPI 3.0.1 document
(`github.com/PaystackOSS/openapi`, `dist/paystack.yaml`; paystack.com itself answers 403 to server
clients).

App id `io.w6w.paystack` · category `commerce` · egress `api.paystack.co` and `status.paystack.com`
only (the second serves the status check, nothing else).

## Auth setup

One method, **Secret key** (`secret-key`, bearer). In the Paystack Dashboard open **Settings > API
Keys & Webhooks** and paste the secret key (`sk_test_…` or `sk_live_…`). Use a test key while
building; the connection label shows which mode it is (read from the key's prefix, no request). A
public key (`pk_…`) is refused before any request is made.

The connection test calls `GET /transaction?perPage=1`, which returns transaction records and never
echoes the key. Measured: with no header Paystack answers 401 `{"status":false,"message":"No
Authorization Header was found",…,"code":"invalid_Key"}` and with a made-up key 401 `…"Invalid
key"…"code":"invalid_Key"`. A rejection is classified from that `code`, never from the status.
The key is only ever handled by `sign`.

## Actions (20)

| Group | Actions |
| --- | --- |
| Transactions | `transaction-initialize`, `transaction-verify`, `transaction-get`, `transaction-list` |
| Customers | `customer-create`, `customer-get`, `customer-update`, `customer-list` |
| Plans & subscriptions | `plan-create`, `plan-list`, `subscription-create`, `subscription-get`, `subscription-list` |
| Transfers | `transfer-recipient-create`, `transfer-initiate`, `transfer-get` |
| Refunds | `refund-create`, `refund-list` |
| Reference data | `bank-list`, `balance-get` |

Things worth knowing:

- **Amounts are integers in the currency's smallest unit** (kobo, pesewas, cents): `500000` is
  NGN 5,000. Actions refuse a zero, negative or fractional amount before calling.
- **Every response is an envelope** `{status, message, data, meta}`. Actions return `data`; list actions
  return `{items, meta}` where `meta` is `{total, skipped, perPage, page, pageCount}`.
- **A successful verify call is not a successful payment.** `transaction-verify` answers 200 for a
  `failed` or `abandoned` transaction; check `status === "success"` and the amount and currency before
  fulfilling an order.
- **Lookup by reference vs id.** `transaction-verify` takes the *reference*, `transaction-get` the
  *numeric id*. Customers, plans, subscriptions and transfers are fetched by their `CUS_`/`PLN_`/`SUB_`/`TRF_`
  codes.
- **Page-size spelling.** The OpenAPI document spells it `perPage` on most lists but `per_page` on
  transactions, transfers and transfer recipients. List actions send both; an unknown query key is ignored.
- **`transaction-initialize`, `transfer-initiate`, `refund-create` move or commit money and are not
  idempotent.** Pass your own unique `reference` on the first two so a retry is refused as a duplicate
  instead of paying twice.
- A transfer from an account that requires OTP approval comes back `status: "otp"`; finishing it needs
  `/transfer/finalize_transfer`, which is not covered.
- **Customer `metadata` is a JSON-encoded string** in the spec (`type: string`), unlike transaction
  metadata, which is an object.
- Errors surface the vendor's `message` plus `type/code` and `meta.nextStep`. Failures are 4xx; the 5xx
  family is Paystack's own.

## Health checks

- **`service`** reads `status.paystack.com`. It is **Instatus, not Statuspage**: `/summary.json` is
  `{"page":{"name":"Paystack","status":"UP"}}` (no `status.indicator`), the flat `/components.json` carries
  the components, and Statuspage's `/api/v2/status.json` is a 404 page. The check confirms `page.name`
  first, then lets the `API` component (`cmfdwyrci00e0c8j5wx3jsdde`, group *Platform & Infrastructure*)
  decide the verdict. The other 50-odd components (per-country Cards, Bank, Mobile Money, Webhooks,
  Refunds, ...) are reported as detail only, because a Nigerian card-processor incident is not an API
  outage. Both fetches stay on `status.paystack.com`; no redirect is involved.
- **`quota`** is a declared absence (informational): no rate-limit header on any response sampled, no
  usage endpoint and no documented numeric limit.
- **`auth:secret-key`** is derived from the connection test above.

## Not yet covered

Paystack has about 150 operations; these were left out rather than guessed at:

- Transaction: charge authorization, partial debit, timeline, totals, export; cursor pagination
  (`use_cursor`, `next`, `previous`); the inline `split` object on initialize.
- Charge API (`/charge` and its submit-pin/otp/phone/birthday/address steps), bulk charges, direct debit.
- Customers: validate, risk action, deactivate authorization, identification, authorization initialize/verify.
- Plan fetch/update; subscription disable/enable (needs the email token) and manage link/email.
- Transfers: finalize, bulk, list, verify by reference, export, resend/disable/enable OTP;
  recipient list/fetch/update/delete/bulk.
- Refund fetch and retry-with-customer-details; bank resolve/validate, BIN decision, countries, states.
- Subaccounts, transaction splits, dedicated virtual accounts, terminals, virtual terminals, payment
  requests (invoices), products, storefronts, orders, payment pages, settlements, disputes,
  balance ledger, Apple Pay domains, session timeout.
- Webhooks (verifying the `x-paystack-signature` HMAC and receiving events) are a trigger concern,
  not an action, and are not part of this app.
