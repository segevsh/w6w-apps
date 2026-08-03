# Odoo

Read and write [Odoo](https://www.odoo.com) ERP/CRM records — contacts, CRM leads, sales orders,
products and users — over Odoo's external JSON-RPC API.

Odoo is an open-source ERP whose modules cover CRM, sales, invoicing, inventory, manufacturing,
HR and more. This app targets the models most workflows actually touch, plus discovery and
escape-hatch actions so the rest of an Odoo database stays reachable.

---

## Odoo is RPC, not REST — read this first

This is the single most important thing to understand about the app, and it explains every design
decision below.

**Odoo does not expose resource URLs.** There is no `GET /partners/42`, no `POST /leads`. What Odoo
exposes is its **ORM, remotely**: you name a *model* (`res.partner`), a *method* on that model
(`search_read`, `write`, `action_confirm`), and the arguments to call it with. Every action in this
app is one such call under the hood:

```
execute_kw(db, uid, password, model, method, args, kwargs)
```

Three consequences worth internalising:

1. **The API surface is the database's own schema.** Which models and fields exist depends on which
   Odoo apps that particular database has installed. `crm.lead` exists only with CRM installed;
   `sale.order` only with Sales; a customer's own modules add models nobody else has. No manifest
   can enumerate that, which is why **List Models** and **Describe Model** ship as first-class
   actions — discovery is a runtime question here.

2. **Field names are Odoo's, and they are not what you would guess.** A lead's email address is
   `email_from`. The person's name on a lead is `contact_name`, while `name` is the pipeline card's
   title. Use **Describe Model** before writing records; it will save you more time than anything
   else in this app.

3. **Access control is the ORM's**, not an OAuth scope's. Every call is validated against the
   connected user's record rules and field permissions. A well-scoped bot user simply cannot reach
   records it has no rights to — including through the Call Method escape hatch.

### One model often covers two things

Odoo consistently models what other CRMs split into separate objects as one model plus a
discriminating field. Filtering is therefore a *domain*, not a different action:

| Odoo model        | Covers                             | Discriminator                                  |
| ----------------- | ---------------------------------- | ---------------------------------------------- |
| `res.partner`     | companies **and** people           | `is_company`, with `parent_id` linking them     |
| `crm.lead`        | leads **and** opportunities        | `type` = `lead` \| `opportunity`                |
| `sale.order`      | quotations **and** sales orders    | `state` = `draft`/`sent` → `sale` → `done`      |
| `product.product` | the sellable **variant**           | `product.template` is the catalogue-level record |

`product.product` vs `product.template` catches people out: **order lines reference
`product.product`**, so that is what **List Products** returns. A product with no variants still has
exactly one `product.product` record.

---

## Transport: `/jsonrpc`, and why not the newer `/json/2`

Odoo 19 introduced a genuinely nicer surface — the **External JSON-2 API**,
`POST /json/2/<model>/<method>` with an `Authorization: bearer <api key>` header and named
parameters in the body. It is [documented here][json2] and it is the designated replacement. Odoo's
own RPC page carries a Danger admonition:

> Both the XML-RPC and JSON-RPC APIs at endpoints `/xmlrpc`, `/xmlrpc/2` and `/jsonrpc` are
> scheduled for removal in **Odoo 22 (fall 2028)** and **Online 21.1 (winter 2027)**.

This app nevertheless ships on `/jsonrpc`, deliberately, for two reasons:

- **JSON-2 is Odoo 19+ only.** It is marked "New in version 19.0". Every Odoo 14–18 instance in
  service today — the large majority — cannot serve it at all. `/jsonrpc` works across all of them
  *and* on 19.
- **Everything shipped here was verified on the wire.** Against a live Odoo Online instance
  (`saas~19.3`) on 2026-08-03, every call shape in this app was executed and its response recorded.
  JSON-2's per-method body shapes could **not** be verified, because minting an API key requires
  either the Odoo web UI or a pre-existing key — `res.users.apikeys.generate` takes an existing
  `key` as a parameter and refuses without one (confirmed live: `AccessDenied`). Shipping guessed
  marshalling for `create`/`write`/`unlink` would be exactly the kind of plausible-but-broken
  surface this pack refuses to publish.

The deprecation is real and dated, so migrating to JSON-2 is **scheduled work, not a surprise** —
it should be done against a real Odoo 19 instance with a real API key, and the first hard deadline
is Odoo Online 21.1 in winter 2027.

**XML-RPC is not an option here, and that is fine.** Odoo's documentation leads with XML-RPC, which
would mean hand-rolling XML marshalling for arbitrary Python types inside the sandbox. `/jsonrpc`
carries the identical `execute_kw` surface with JSON on both ends, so `ctx.fetch` plus `JSON.parse`
is genuinely sufficient — no XML, no raw sockets.

---

## Connecting

| Field            | Example                     | Notes                                                     |
| ---------------- | --------------------------- | --------------------------------------------------------- |
| **Instance URL** | `https://mycompany.odoo.com` | Bare hosts and pasted browser URLs are normalised.         |
| **Database**     | `mycompany`                  | Usually the subdomain on Odoo Online.                      |
| **Login**        | `bot@mycompany.com`          | Prefer a dedicated bot user.                               |
| **API Key**      | *(secret)*                   | Preferences → Account Security → New API Key.              |

### Two things that block most first connections

**1. External API access is a paid entitlement.** Odoo states on both external-API pages:

> Access to data via the external API is only available on **Custom** Odoo pricing plans. Access to
> the external API is not available on **One App Free** or **Standard** plans.

If your plan does not include it, no credential will work. See [Odoo pricing][pricing].

**2. Odoo Online users have no local password.** Odoo's own documentation flags this, and it is the
most common cause of a rejected connection:

> For Odoo Online instances (`<domain>.odoo.com`), users are created without a local password (as a
> person you are logged in via the Odoo Online authentication system, not by the instance itself).

Minting an API key solves this without setting a password at all, which is why this app asks for a
key rather than a password.

### How authentication works here

Odoo's `/jsonrpc` does not authenticate the *request* — it authenticates the *call*. Credentials are
three **positional arguments** of `execute_kw` itself. There is no `Authorization` header to set.

The app still honours the sandbox rule that actions never see credentials, by splitting the request:

- an **action** builds a four-element, credential-free envelope `[model, method, args, kwargs]` —
  it names what to call and never learns who is calling;
- the **`sign` hook** — the only code handed the credential, running network-less — unshifts
  `[db, uid, password]` onto the front, producing the seven-element form Odoo expects.

`execute_kw` needs a numeric **uid**, not a login. Resolving it is a network call, and `sign` is
network-less by design, so the **`afterConnect`-time `exchange` hook** authenticates once and stores
the uid in the opaque credential. Actions never re-authenticate, and a bad database name or a
password-less Odoo Online user fails while the user is still looking at the connect form.

### Use an API key, and scope the user

Odoo's docs are explicit that "The way to use API Keys in your scripts is to simply replace your
password by the key. The login remains in-use." Prefer a key: they are individually revocable, carry
a mandatory expiry (Odoo caps them at three months), and cannot be used to log into the web UI.

> **Host-specific caveat worth knowing.** Because the credential travels as a *positional array
> element* rather than under a key named `password`, the runtime's egress-capture redaction — which
> masks by key name — does **not** mask it. If egress capture is enabled, an Odoo credential can
> appear in captured request bodies. A short-lived, revocable, minimally-scoped API key is a
> materially better thing to have in that position than a human's account password. This is also a
> genuine point in favour of migrating to JSON-2, where the credential rides in the (redacted)
> `Authorization` header.

Odoo also recommends a **dedicated bot user**: grant it only the rights the integration needs, and
leave its password empty so only the API key works.

---

## Actions

### Contacts — `res.partner`

| Action              | Type      | Calls                    |
| ------------------- | --------- | ------------------------ |
| **List Contacts**   | `search`  | `search_read`            |
| **Get Contact**     | `read`    | `read`                   |
| **Create Contact**  | `perform` | `create`                 |
| **Update Contact**  | `perform` | `write`                  |
| **Delete Contact**  | `perform` | `unlink`                 |

### CRM — `crm.lead`

| Action           | Type      | Calls         |
| ---------------- | --------- | ------------- |
| **List Leads**   | `search`  | `search_read` |
| **Get Lead**     | `read`    | `read`        |
| **Create Lead**  | `perform` | `create`      |
| **Update Lead**  | `perform` | `write`       |

Moving a card along the pipeline is a `stage_id` write via **Update Lead**. Stage ids are
per-database `crm.stage` records — list them with **Search Records**.

### Sales — `sale.order`

| Action                   | Type      | Calls            |
| ------------------------ | --------- | ---------------- |
| **List Sales Orders**    | `search`  | `search_read`    |
| **Get Sales Order**      | `read`    | `read`           |
| **Create Sales Order**   | `perform` | `create`         |
| **Confirm Sales Order**  | `perform` | `action_confirm` |

**Confirm Sales Order calls `action_confirm`, not a write to `state`** — and that distinction is the
point. Setting the field would change a field; confirming runs Odoo's real confirmation logic
(validation, stock moves, deliveries, invoicing schedules) in **one transaction**. Odoo's own
documentation makes this the general rule, and it is worth quoting because it shapes the whole app:

> All calls to the JSON-2 endpoint run in their own SQL transaction. […] it is not possible to chain
> multiple calls inside a single transaction. […] The solution is to always call a single method
> that performs all the related operations in a single transaction.

The same is true of `/jsonrpc`. Business methods prefixed `action_` are exactly those single
methods — which is also the argument for the **Call Method** escape hatch.

Order lines use Odoo's **x2many command format**, passed through verbatim rather than hidden behind
a friendlier shape that would limit what you can express:

```json
[[0, 0, {"product_id": 61, "product_uom_qty": 2}]]
```

The leading `0` is the "create a new linked record" opcode. Others: `1` update, `2` delete,
`3` unlink, `4` link existing, `5` unlink all, `6` replace the set.

### Catalogue & users

| Action             | Type     | Model              |
| ------------------ | -------- | ------------------ |
| **List Products**  | `search` | `product.product`  |
| **Get Product**    | `read`   | `product.product`  |
| **List Users**     | `search` | `res.users`        |

`list_price` is the *catalogue* price. Customer-specific prices come from pricelists and are
computed, not stored — pass a `pricelist` in Context if you need them.

### Discovery & escape hatches

| Action              | Type      | What it does                                                  |
| ------------------- | --------- | ------------------------------------------------------------- |
| **List Models**     | `search`  | `ir.model` — which models this database actually has           |
| **Describe Model**  | `read`    | `fields_get` — a model's fields, types and requiredness        |
| **Search Records**  | `search`  | `search_read` against **any** model                            |
| **Count Records**   | `read`    | `search_count` — how many match, without transferring them     |
| **Call Method**     | `perform` | `execute_kw` with a caller-supplied model, method and args     |

Without these, the honest description of this app would be "Odoo, but only the six models we thought
of". With them, the named actions are ergonomic shortcuts rather than a ceiling — `account.move`,
`project.task`, `stock.picking`, `hr.employee` and custom models are all reachable.

**Call Method does not widen access.** `execute_kw` is validated against the connected user's
permissions exactly as every other call is. Constrain it the way Odoo intends: with a bot user.

### Argument ordering — verified, not assumed

Splitting parameters between positional `args` and keyword `kwargs` wrongly is *the* classic silent
failure on this API. Every shape below was executed against a live Odoo instance (`saas~19.3`) on
2026-08-03 and its response recorded:

| Method           | `args`            | `kwargs`                  | Result        |
| ---------------- | ----------------- | ------------------------- | ------------- |
| `search_read`    | `[]`              | `{domain, fields, limit}` | `[{id,…}]`    |
| `read`           | `[[166]]`         | `{fields}`                | `[{id,…}]`    |
| `create`         | `[{vals}]`        | `{}`                      | `167` (id)    |
| `create`         | `[[{vals}]]`      | `{}`                      | `[166]` (ids) |
| `write`          | `[[166], {vals}]` | `{}`                      | `true`        |
| `unlink`         | `[[166,167]]`     | `{}`                      | `true`        |
| `search_count`   | `[[domain]]`      | `{}`                      | `2`           |
| `fields_get`     | `[]`              | `{allfields, attributes}` | `{field:{…}}` |
| `action_confirm` | `[[52]]`          | `{}`                      | `true`        |

Four findings from that session that a reasonable person would have guessed wrong:

1. **`create` will not accept its values as a keyword argument.** `kwargs: {vals_list: [{...}]}`
   fails with `builtins.IndexError: list index out of range` — it is `@api.model_create_multi` and
   dispatches positionally. `search_read`, by contrast, is perfectly happy fully keyword-style. The
   two genuinely differ, so this app does not apply one rule to both.
2. **`search_count` takes the domain positionally** as a one-element `args` whose element *is* the
   domain — a different shape from `search_read`.
3. **`read` skips missing ids silently**, returning a shorter list with no error, even though
   `unlink` raises `MissingError` for the same ids. Compare `count` against what you asked for.
4. **Odoo answers HTTP 200 even when the call failed.** An `AccessDenied` from a wrong password and
   an `AttributeError` from a bad method both returned `200 application/json`, with the failure only
   inside `body.error`. A client trusting `res.ok` would hand `undefined` to the workflow and call it
   success. This app always inspects the body, and the body is the authority.

---

## Health checks

| Check        | Kind         | Verdict                                                      |
| ------------ | ------------ | ------------------------------------------------------------ |
| `instance`   | `dependency` | **Real probe** — unauthenticated `common.version` against this connection's own Odoo server |
| `service`    | `service`    | **Declared unavailable** — Odoo publishes nothing machine-readable |
| `quota`      | `quota`      | **Declared unavailable** — Odoo meters nothing on the external API |

**`instance` is the check that matters.** An Odoo deployment's health is a property of *that
deployment*, not of odoo.com — every connection points at a different server. A single
unauthenticated `common.version` call separates three failures a credential check would conflate:
the host does not resolve; the host answers but `/jsonrpc` is disabled or a proxy is in front; or the
named database is not served. It is `credential: "context"` — it needs the Connection to know which
host to call, and no credential to interpret the answer.

**`service` is declared unavailable, and the evidence is worth recording** because "there's a status
page" looks like there should be an API. `https://status.odoo.com/` is a client-rendered SPA that
serves the **same 34,068-byte HTML document for every path** — the conventional Statuspage
endpoints, the conventional feed paths, and deliberately invented ones alike:

```
GET /api/v2/status.json                    -> 200  text/html  34068 bytes
GET /api/v2/summary.json                   -> 200  text/html  34068 bytes
GET /history.rss  /history.atom            -> 200  text/html  34068 bytes
GET /api/v2/w6w-bogus-does-not-exist.json  -> 200  text/html  34068 bytes
GET /totally-fake-path-xyz                 -> 200  text/html  34068 bytes
```

The bodies are byte-identical (md5 `9322b33d…`), and the document references no API host of its own.
So there is no JSON status API and no Atom/RSS feed — there is an HTML catch-all answering 200 to
anything. Probing `/api/v2/status.json` would have yielded a permanently cheerful check derived from
parsing marketing HTML. **Both** a bogus-sibling probe and content-type/body inspection were needed
to catch this: the bogus-path check alone would have passed, because this host 200s that too.

**`quota` is declared unavailable** because a live `/jsonrpc` response carried no rate-limit headers
of any kind — no `RateLimit`, no `RateLimit-Limit`/`-Remaining`/`-Reset`, no legacy `X-Rate-Limit-*`,
no `Retry-After`. Odoo is a self-hostable application server, not a metered API product; its real
ceiling is worker count and database capacity, which no response header exposes. The relevant
commercial limit is the **plan entitlement** described above — a binary, not headroom, and it
surfaces as outright failure that the derived `auth:*` check already reports.

Both absences are `severity: "informational"`. An `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in the roll-up — at any other severity a declared absence would pin every
verdict at `unknown` forever.

---

## Egress

`network.allow` is `["*"]`, and this is the one place the app cannot be narrow. Odoo Online lives at
`*.odoo.com`, but **self-hosted Odoo is extremely common** and lives at whatever domain (or LAN host
and port) the customer chose. The instance URL is a user-supplied field, which is precisely the case
the spec names for `"*"`. The same reasoning applies to the `wordpress` app in this pack.

If your deployment only ever talks to Odoo Online, tightening this to `["*.odoo.com"]` in a fork is
safe and worth doing.

---

## Development

```bash
deno task test    # 169 unit tests
deno task check   # typecheck
deno task lint
deno task fmt
```

Tests use a mocked `HookContext`; no network and no Odoo instance are required. The suite pins the
`execute_kw` argument ordering for every action, the credential-splice ordering in `sign`
(`[db, uid, password]`, in that order), the HTTP-200-on-error trap, and that no action ever
references a credential or sets an `Authorization` header.

---

## Icon

`assets/icon.svg` is drawn for this pack — two overlapping rings in Odoo's brand purples
(`#714B67`, `#875A7B`). It is **not** a copy of a vendor asset: Odoo publishes no downloadable
brand mark, and n8n's `nodes-base` Odoo icon is itself a simplification (one filled ring), not
the vendor's own artwork, so there was nothing to port verbatim. Replace it if an official mark
is ever sourced. The pack README lists this as one of its two stated icon exceptions.

## Links

- **Odoo** — <https://www.odoo.com>
- **External JSON-2 API** (current; the designated successor) — [odoo.com/documentation/19.0/…/external_api.html][json2]
- **External RPC API** (what this app uses; carries the deprecation notice) — [odoo.com/documentation/19.0/…/external_rpc_api.html][rpc]
- **Pricing** (the external-API entitlement) — [odoo.com/pricing][pricing]
- **Source** — <https://github.com/odoo/odoo> · org: <https://github.com/odoo>

Every Odoo database also serves its **own** live API documentation at `/doc` on the instance —
generated from the models that database actually has installed, which is the authoritative reference
for field names.

> A note on the docs link: this app was scoped from a candidate list whose Odoo entry pointed at
> `odoo.com/documentation/9.0/reference/orm.html`. That URL still resolves and still serves real
> content, so a status check would not have flagged it — but it is the **Odoo 9.0 internal ORM
> reference**, ten major versions stale, and it documents the ORM as seen from *inside* a module,
> not the external API at all. The current external-API docs are the two links above;
> `documentation/latest/` redirects to `19.0`, and `20.0` does not exist.

[json2]: https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
[rpc]: https://www.odoo.com/documentation/19.0/developer/reference/external_rpc_api.html
[pricing]: https://www.odoo.com/pricing
