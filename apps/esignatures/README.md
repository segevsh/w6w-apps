# eSignatures

Send contracts for e-signature from a template, manage signers, edit contract and template
content, and manage templates and their collaborators on [eSignatures.com](https://esignatures.com).

- App id `io.w6w.esignatures`, categories `legal`, `documents`.
- Built against the API reference at <https://esignatures.com/docs/api> (version 1.3, fetched
  2026-10-06) and live probes on the same day. Nothing here is inferred from another app.
- Network: `esignatures.com` only.

## Authentication

One method, **Secret Token** (`type: "basic"`): the token is the HTTP Basic *username*, the
password is empty (`Authorization: Basic base64("<token>:")`). Find it on the API page of your
eSignatures.com account.

The vendor also accepts `?token=<secret>` in the URL. This app never uses it: URLs end up in logs,
headers do not. Credentials exist only in the `sign` hook; no action touches them.

**Credential check (`test`)** is `GET /api/templates`: cheap, takes no id, and its body does not echo
the token (unlike a whoami). It passes only when the response is the documented shape
(`data` is an array), never on a bare HTTP 200. A bad token answers **HTTP 403** (not 401) with
`{"status":"error","data":{"error_code":"forbidden",...}}`, and a *missing* token answers
byte-identically, so the check classifies on `error_code` and its message says both causes
are possible.

## Actions (24)

| Resource | Actions |
|---|---|
| Contract | `contract-create`, `contract-get`, `contract-withdraw`, `contract-send-draft`, `contract-pdf-preview`, `contract-content-get`, `contract-content-update`, `contract-placeholders-get`, `contract-placeholders-update` |
| Signer | `signer-add`, `signer-update`, `signer-resend`, `signer-delete` |
| Template | `template-list`, `template-get`, `template-create`, `template-update`, `template-duplicate`, `template-delete`, `template-content-get`, `template-content-update` |
| Collaborator | `collaborator-add`, `collaborator-list`, `collaborator-remove` |

Every documented REST endpoint is covered. The vendor sends no idempotency key: anything that
creates or sends (`contract-create`, `contract-send-draft`, `signer-add`, `signer-resend`, template
create/duplicate, `collaborator-add`) is `idempotent: false`, so the runtime will not retry it.

### Things worth knowing

- **Live vs test.** `contract-create` with `test` off creates a live, billed contract. Turn `test`
  on for a free, demo-stamped one. Neither flag is sent unless set.
- **Booleans are `"yes"`/`"no"` strings** on the wire; the actions take real booleans and convert.
- **There is no "list contracts" endpoint** in the reference. Track contracts by saving the id from
  `contract-create` and by webhooks.
- **Do not poll `contract-get`.** The vendor rate-limits adaptively and may block polling;
  contracts older than two weeks can return incomplete data; `contract_pdf_url` expires 3 days
  after each request.
- **Template create / duplicate / collaborator-add return `data` as an array** with one entry.
  The actions lift `templateId` / `collaborator` out for you.
- **`contract-pdf-preview`** only queues the render; the URL arrives by a `contract-pdf-generated`
  webhook, which this app cannot receive.
- **`contract-placeholders-update`** sends the schema form `{"placeholder_fields": [...]}`; the
  reference's curl example shows a bare object, which contradicts its own JSON schema.
- **`signer-delete`** uses `POST .../signers/{id}/delete` (the reference's curl line has a typo, a
  missing slash, but its heading is explicit).
- **Empty delivery-method selections are omitted**, never sent as `[]`: the vendor reads `[]` as
  "do not send the signature request".
- **`target_secret_token`** on template duplicate (copy into another account) is deliberately not
  exposed: it is another account's credential and credentials stay in `sign`.

### Left out, and why

- **Webhooks / triggers.** The vendor posts events to one URL configured in its dashboard (or
  per contract via `custom_webhook_url`), signed `X-Signature-SHA256` with the secret token. There
  is no API to subscribe, so this app declares no triggers. `custom_webhook_url` is a
  `contract-create` parameter, so a workflow endpoint can be wired per contract.
- **Embedded signing** is a front-end iframe feature (`sign_page_url` + `embedded=yes`), not an API
  call; the URL is returned by `contract-create` / `contract-get`.

A grep of the reference for `deprecat|depreciat|sunset|will be removed|end of life` finds
nothing; the whole documented surface is live.

## API host

The vendor moved from `esignatures.io` to `esignatures.com`. Measured 2026-10-06: both hostnames
answer `/api/templates` with the same 403 envelope, but only `.com` is documented, so only `.com`
is called and allowed.

## Health checks

| Check | Kind | Probe |
|---|---|---|
| `service` | service | **Declared absence**, `severity: informational`. eSignatures.com publishes no status page and its docs link to none. |
| `api` | dependency | Unsigned `GET /api/templates`. A schema-correct error body (`error_code`) is a **pass**: reachability proven. 5xx or a non-JSON body is `down`; JSON that is not the vendor envelope is `unknown`. |
| `auth:secret-token` | credential | Derived from the auth `test` hook above. |

No quota check: the API exposes no usage or rate-limit headers in its reference.

## Tests

`deno task test` runs 80 tests: the entry module, the auth method, the health check, and each of
the 24 actions against a mocked `HookContext` (fake `ctx.fetch`, no-op `ctx.log`).
Gate: `deno task fmt && deno task validate && deno task check && deno task lint && deno task test`.
