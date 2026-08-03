import type { HookContext, Param } from "@w6w/types";

/**
 * Odoo external API — JSON-RPC over HTTP.
 *
 * ## Odoo is RPC, not REST. This is the single most important thing to know.
 *
 * Odoo does not expose resource URLs. There is no `GET /partners/42`. What it
 * exposes is its **ORM**, remotely: you name a *model* (`res.partner`), a
 * *method* on that model (`search_read`, `write`, `action_confirm`) and the
 * arguments to call it with. Every operation in this app — listing contacts,
 * confirming a sales order — is one `execute_kw` call under the hood. The
 * actions are named, typed wrappers that fix the model and method and shape the
 * arguments, so a workflow author never has to hand-assemble an RPC envelope.
 *
 * Two consequences worth internalising:
 *
 *  1. **The "API surface" is the database's own schema.** Which models and
 *     fields exist depends on which Odoo apps that particular database has
 *     installed. `crm.lead` only exists if CRM is installed. That is why this
 *     app ships `list-models` and `describe-model`: discovery is a runtime
 *     question here, not something a manifest can enumerate.
 *  2. **Access control is the ORM's**, not an OAuth scope's. Every call is
 *     validated against the connected user's record rules and field access.
 *     A well-scoped bot user simply cannot see records it has no rights to.
 *
 * ## Transport: `/jsonrpc`, and the honest reason it is not `/json/2`
 *
 * Odoo 19 introduced a genuinely nicer surface — the **External JSON-2 API**,
 * `POST /json/2/<model>/<method>` with an `Authorization: bearer <api key>`
 * header and named parameters in the body. It is documented at
 * <https://www.odoo.com/documentation/19.0/developer/reference/external_api.html>
 * and it is the designated replacement: Odoo's own RPC page carries a Danger
 * admonition stating that "Both the XML-RPC and JSON-RPC APIs at endpoints
 * `/xmlrpc`, `/xmlrpc/2` and `/jsonrpc` are scheduled for removal in Odoo 22
 * (fall 2028) and Online 21.1 (winter 2027)."
 *
 * This app nevertheless ships on `/jsonrpc`, deliberately:
 *
 *   - **JSON-2 is Odoo 19+ only.** It is marked "New in version 19.0". Every
 *     Odoo 14–18 instance in service today — the large majority — cannot serve
 *     it at all. `/jsonrpc` works across all of them *and* on 19.
 *   - **Everything here was verified on the wire.** Against a live Odoo Online
 *     instance (`saas~19.3`, 2026-08-03) every call shape below was executed
 *     and its result recorded — see the per-method notes on `OdooClient.call`.
 *     JSON-2's per-method body shapes could **not** be verified, because minting
 *     an API key requires either the Odoo web UI or a pre-existing key
 *     (`res.users.apikeys.generate` takes an existing `key` as a parameter and
 *     refuses without one — confirmed live, `AccessDenied`). Shipping guessed
 *     marshalling for `create`/`write`/`unlink` would be exactly the kind of
 *     plausible-but-broken surface this pack refuses to publish.
 *
 * The deprecation is real and dated, so migration is scheduled work rather than
 * a surprise. See the README's "Transport" section for the full argument.
 *
 * ## XML-RPC is not an option here, and that is fine
 *
 * Odoo's *documented* external API page leads with XML-RPC. That path is
 * unreachable from a w6w app for a good reason: it would mean hand-rolling XML
 * marshalling and unmarshalling for arbitrary Python types inside the sandbox.
 * `/jsonrpc` carries the identical `execute_kw` surface with JSON on both ends,
 * so `ctx.fetch` plus `JSON.parse` is genuinely sufficient. No XML, no sockets.
 */

/** The JSON-RPC endpoint path, appended to the instance's base URL. */
export const JSONRPC_PATH = "/jsonrpc";

/**
 * Redacted, non-secret Connection metadata this app republishes via
 * `afterConnect`, so action code (which never sees the credential) can still
 * build a URL and name a database.
 *
 * Note what is deliberately absent: `apiKey`. The instance URL, the database
 * name, the login and the resolved uid are all identifiers, not secrets — the
 * database name in particular travels in a plain request header on every call.
 * The credential itself stays in the credential, visible only to `sign`.
 */
export interface OdooConnectionDisplay {
  instanceUrl?: string;
  database?: string;
  username?: string;
  uid?: number;
  serverVersion?: string;
}

/**
 * Normalise an Odoo instance URL to a bare origin.
 *
 * Users paste all of `mycompany.odoo.com`, `https://mycompany.odoo.com`, and
 * `https://mycompany.odoo.com/web#action=...` (straight from the browser bar).
 * All three name the same instance, so all three are accepted and reduced to
 * the origin. A missing scheme becomes `https://` — Odoo Online is HTTPS-only
 * and a self-hosted instance carrying a password over plaintext HTTP is a
 * mistake we should not quietly enable.
 */
export function resolveInstanceUrl(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) throw new Error("Odoo connection is missing an instance URL");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Odoo instance URL is not a valid URL: ${raw}`);
  }
  if (!url.hostname) throw new Error(`Odoo instance URL has no host: ${raw}`);
  return url.origin;
}

/** The full `/jsonrpc` URL for an instance. */
export function jsonRpcUrl(instanceUrl: string): string {
  return `${resolveInstanceUrl(instanceUrl)}${JSONRPC_PATH}`;
}

/**
 * How many elements `params.args` carries before and after signing.
 *
 * These two constants are the contract between the action side and the auth
 * side, and they are exported so the `sign` hook and its tests reference the
 * same numbers rather than two hand-copied literals that can drift apart.
 *
 *   unsigned (4):  [model, method, args, kwargs]
 *   signed   (7):  [db, uid, password, model, method, args, kwargs]
 *
 * `sign` unshifts the three credential slots onto the front. See `signExecuteKw`
 * in `../auth/api-key.ts` for why the split is drawn exactly here.
 */
export const UNSIGNED_ARG_COUNT = 4;
export const SIGNED_ARG_COUNT = 7;

/** The JSON-RPC service names Odoo exposes. Only `object` is ever signed. */
export const OBJECT_SERVICE = "object";
export const COMMON_SERVICE = "common";

/** Odoo's error object, as carried inside a JSON-RPC error response. */
export interface OdooErrorData {
  name?: string;
  message?: string;
  arguments?: unknown[];
  debug?: string;
}

export interface OdooRpcResponse<T = unknown> {
  jsonrpc?: string;
  id?: number | string | null;
  result?: T;
  error?: {
    code?: number;
    message?: string;
    data?: OdooErrorData;
  };
}

/**
 * Build the UNSIGNED `execute_kw` envelope.
 *
 * The credential slots are simply absent — not `null` placeholders. An action
 * that emitted placeholders would be describing the shape of a credential it is
 * not allowed to know about, and a placeholder that failed to be overwritten
 * would be sent to Odoo as a literal `null` password. Absence fails loudly
 * instead: an unsigned body has four `args`, and Odoo rejects it outright.
 */
export function buildExecuteKwBody(
  model: string,
  method: string,
  args: unknown[] = [],
  kwargs: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: OBJECT_SERVICE,
      method: "execute_kw",
      args: [model, method, args, kwargs],
    },
    // A constant id is correct here: JSON-RPC ids exist to correlate responses
    // on a multiplexed channel, and each `ctx.fetch` is its own request/response
    // pair. Odoo echoes it back and neither side does anything else with it.
    id: 1,
  });
}

/** Build the unsigned envelope for an unauthenticated `common` service call. */
export function buildCommonBody(method: string, args: unknown[] = []): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "call",
    params: { service: COMMON_SERVICE, method, args },
    id: 1,
  });
}

/**
 * Turn a JSON-RPC response into a value, or throw with Odoo's own diagnosis.
 *
 * ## The trap this exists to close
 *
 * **Odoo answers HTTP 200 even when the call failed.** Verified live on
 * 2026-08-03: an `AccessDenied` from a wrong password and an `AttributeError`
 * from a non-existent method both came back as `HTTP 200`,
 * `content-type: application/json`, with the failure reported only inside
 * `body.error`. A client that trusted `res.ok` would treat a rejected
 * credential as a successful call and hand `undefined` to the workflow.
 *
 * So the status code is checked *and* the body is inspected, always, and the
 * body is the authority.
 *
 * The thrown message leads with `data.name` (the fully-qualified Python
 * exception, e.g. `odoo.exceptions.AccessError`) because that is the part an
 * operator can act on — it distinguishes "you may not read this model" from
 * "this field does not exist" from "the credential is wrong". `data.debug`
 * carries a full server traceback and is deliberately NOT surfaced: it is
 * server-internal detail, often large, and belongs in Odoo's own logs.
 */
export function unwrapRpc<T>(status: number, text: string): T {
  let body: OdooRpcResponse<T>;
  try {
    body = JSON.parse(text) as OdooRpcResponse<T>;
  } catch {
    // A non-JSON body means we did not reach Odoo's RPC endpoint at all —
    // typically a reverse proxy, a login page, or a 404 HTML shell.
    const snippet = text.slice(0, 200);
    throw new Error(
      `Odoo returned a non-JSON response (HTTP ${status}). ` +
        `Check the instance URL points at an Odoo server with /jsonrpc enabled: ${snippet}`,
    );
  }

  if (body.error) {
    const data = body.error.data ?? {};
    const name = data.name ?? body.error.message ?? "Odoo Server Error";
    const message = data.message?.trim() || body.error.message || "no message";
    throw new Error(`Odoo ${name}: ${message}`);
  }

  if (status < 200 || status >= 300) {
    throw new Error(`Odoo returned HTTP ${status} with no JSON-RPC error object`);
  }

  return body.result as T;
}

/**
 * Thin wrapper over `ctx.fetch` for the `object`/`execute_kw` surface.
 *
 * Note what is deliberately absent: this class never reads a credential and
 * never builds an `Authorization` header or a `db`/`uid`/`password` argument.
 * It emits the four-element unsigned envelope and the runtime routes it through
 * the auth `sign` hook, which is the only code handed the raw credential.
 */
export class OdooClient {
  constructor(private ctx: HookContext, private instanceUrl: string, private database?: string) {}

  /**
   * Build a client from the redacted Connection metadata `afterConnect`
   * published. This is the only constructor an action should use.
   */
  static fromConnection(ctx: HookContext): OdooClient {
    const display = (ctx.connection?.display ?? {}) as OdooConnectionDisplay;
    return new OdooClient(ctx, resolveInstanceUrl(display.instanceUrl), display.database);
  }

  /**
   * Call a method on an Odoo model.
   *
   * ## Argument ordering — verified, not assumed
   *
   * `execute_kw(model, method, args, kwargs)` splits parameters into POSITIONAL
   * (`args`) and KEYWORD (`kwargs`). Getting that split wrong is the classic
   * silent failure on this API, so every shape this app uses was executed
   * against a live Odoo instance (`saas~19.3`) on 2026-08-03 and its response
   * recorded:
   *
   * | method          | args                  | kwargs                      | result        |
   * | --------------- | --------------------- | --------------------------- | ------------- |
   * | `search_read`   | `[]`                  | `{domain, fields, limit}`   | `[{id,…}]`    |
   * | `read`          | `[[166]]`             | `{fields}`                  | `[{id,…}]`    |
   * | `create`        | `[{vals}]`            | `{}`                        | `167` (id)    |
   * | `create`        | `[[{vals}]]`          | `{}`                        | `[166]` (ids) |
   * | `write`         | `[[166], {vals}]`     | `{}`                        | `true`        |
   * | `unlink`        | `[[166,167]]`         | `{}`                        | `true`        |
   * | `search_count`  | `[[domain]]`          | `{}`                        | `2`           |
   * | `fields_get`    | `[]`                  | `{allfields, attributes}`   | `{field:{…}}` |
   * | `action_confirm`| `[[52]]`              | `{}`                        | `true`        |
   *
   * Two findings from that session that a reasonable person would have guessed
   * wrong, and which are the reason this table exists:
   *
   *  1. **`create` will not accept `vals_list` as a keyword argument.** Passing
   *     `kwargs: {vals_list: [{...}]}` fails with `builtins.IndexError: list
   *     index out of range` — `create` is `@api.model_create_multi` and the RPC
   *     layer dispatches it positionally. It MUST go in `args`.
   *  2. **`search_read` is happy with a fully keyword call** (`args: []`,
   *     `domain` in `kwargs`), unlike `create`. The two are genuinely different,
   *     so this app does not apply one rule to both.
   *
   * `context` is passed as a `kwargs` entry (verified: `{lang: "en_US"}` on a
   * `search_read` returned normally), which is how Odoo threads language,
   * timezone and company selection through a call.
   */
  async call<T = unknown>(
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json",
    };

    // Required whenever one Odoo server hosts several databases and its
    // `dbfilter` does not select by Host — which is exactly the Odoo Online
    // case. Verified: without this header an Odoo Online instance answers
    // `404 … No database is selected`, and its own body suggests the fix
    // ("Alternatively, use the X-Odoo-Database header").
    //
    // The database name is an identifier, not a secret; it also travels inside
    // the signed body as `args[0]`, which `sign` fills from the credential.
    if (this.database) headers["x-odoo-database"] = this.database;

    const res = await this.ctx.fetch(jsonRpcUrl(this.instanceUrl), {
      method: "POST",
      headers,
      body: buildExecuteKwBody(model, method, args, kwargs),
    });

    return unwrapRpc<T>(res.status, await res.text());
  }
}

// --- shared Param fragments -------------------------------------------------
//
// Every model-oriented action reuses these so that reading records looks
// identical whichever model it is pointed at.

/**
 * A domain is Odoo's filter language: a list of `[field, operator, value]`
 * triples combined with the prefix operators `&`, `|` and `!`.
 *
 * It is typed `json` rather than `string` because it genuinely is structured
 * data, and because a string would invite users to paste Python-ish `'` quoting
 * that is not valid JSON.
 */
export const DOMAIN_PARAM: Param = {
  key: "domain",
  label: "Filter (domain)",
  type: "json",
  hint: 'Odoo domain, e.g. `[["is_company","=",true]]`. Combine with prefix operators: ' +
    '`["|",["a","=",1],["b","=",2]]`. Leave empty to match every record the user may read.',
};

export const FIELDS_PARAM: Param = {
  key: "fields",
  label: "Fields",
  type: "string",
  hint: "Comma-separated field names to return, e.g. `name,email,phone`. Leave empty to let Odoo " +
    "return its default set — which is large, so naming fields is usually much faster. " +
    "Use the Describe Model action to discover field names.",
};

export const LIMIT_PARAM: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  hint: "Maximum records to return. Odoo returns everything matching when this is empty.",
};

export const OFFSET_PARAM: Param = {
  key: "offset",
  label: "Offset",
  type: "number",
  hint: "Records to skip, for paging through a large result set.",
};

export const ORDER_PARAM: Param = {
  key: "order",
  label: "Sort order",
  type: "string",
  hint: "SQL-style ordering, e.g. `create_date desc` or `name asc, id desc`.",
};

/**
 * Odoo's per-call context. Threading `lang`/`tz` through matters more than it
 * looks: Odoo renders translatable fields and formats datetimes according to it,
 * so a workflow that omits it silently inherits the bot user's own settings.
 */
export const CONTEXT_PARAM: Param = {
  key: "context",
  label: "Context",
  type: "json",
  hint:
    'Odoo context object, e.g. `{"lang":"en_US","tz":"Europe/Brussels"}`. Controls translation, ' +
    "timezone and active-company selection for this call.",
};

/** The `output` fragment every record-listing action reuses. */
export const RECORDS_OUTPUT = [
  { key: "records", type: "array" as const, label: "Records" },
  { key: "count", type: "number" as const, label: "Number of records returned" },
];

/**
 * Shared input shape for the read-side actions.
 *
 * `fields` is a comma-separated string at the form and a `string[]` on the
 * wire; `splitFields` is the one place that conversion happens.
 */
export interface ReadInput {
  domain?: unknown;
  fields?: string;
  limit?: number;
  offset?: number;
  order?: string;
  context?: Record<string, unknown>;
}

/**
 * Split the comma-separated `fields` form value into the array Odoo expects.
 *
 * Returns `undefined` — not `[]` — when nothing was supplied. The distinction is
 * load-bearing: Odoo reads `fields: []` as "return every field", while omitting
 * the key entirely selects its default set. Sending `[]` for an empty form box
 * would quietly turn a narrow read into the widest possible one.
 */
export function splitFields(fields: string | undefined): string[] | undefined {
  if (!fields) return undefined;
  const list = fields.split(",").map((f) => f.trim()).filter(Boolean);
  return list.length > 0 ? list : undefined;
}

/**
 * Coerce the `domain` form value into the list Odoo expects.
 *
 * The param is typed `json`, but a host may hand a hook the raw string a user
 * typed, so both are accepted. An empty domain is `[]`, which matches every
 * record the connected user is permitted to read.
 */
export function toDomain(domain: unknown): unknown[] {
  if (domain === undefined || domain === null || domain === "") return [];
  if (Array.isArray(domain)) return domain;
  if (typeof domain === "string") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(domain);
    } catch {
      throw new Error(`Filter (domain) is not valid JSON: ${domain}`);
    }
    if (!Array.isArray(parsed)) throw new Error("Filter (domain) must be a JSON array");
    return parsed;
  }
  throw new Error("Filter (domain) must be a JSON array");
}

/**
 * Coerce a record-id form value into the `number[]` Odoo expects.
 *
 * Accepts a single number, an array, or a comma-separated string, because all
 * three are natural things for an upstream workflow step to produce. Ids are
 * validated as integers rather than passed through: a `NaN` reaching Odoo
 * becomes a confusing server-side error a long way from its cause.
 */
export function toIds(ids: unknown): number[] {
  // The empty check MUST come first. A blank form box arrives as `""`, and
  // `"".split(",")` is `[""]`, which coerces to `[0]` — a valid-looking id that
  // would silently target record 0. The "no ids supplied" guards in the delete
  // and confirm actions depend on this returning an empty array.
  if (ids === undefined || ids === null || ids === "") return [];

  const raw = Array.isArray(ids) ? ids : typeof ids === "string" ? ids.split(",") : [ids];

  return raw.map((v) => {
    const n = typeof v === "number" ? v : Number(String(v).trim());
    if (!Number.isInteger(n)) throw new Error(`Record id is not an integer: ${String(v)}`);
    return n;
  });
}

/**
 * Build the `kwargs` for a `search_read`, omitting every key the caller left
 * blank so Odoo applies its own defaults rather than being told "no limit,
 * no ordering, no fields" explicitly.
 */
export function searchKwargs(input: ReadInput): Record<string, unknown> {
  const kwargs: Record<string, unknown> = { domain: toDomain(input.domain) };
  const fields = splitFields(input.fields);
  if (fields) kwargs.fields = fields;
  if (input.limit !== undefined && input.limit !== null) kwargs.limit = input.limit;
  if (input.offset !== undefined && input.offset !== null) kwargs.offset = input.offset;
  if (input.order) kwargs.order = input.order;
  if (input.context) kwargs.context = input.context;
  return kwargs;
}

/** Drop `undefined` values so a `write` never blanks a field nobody mentioned. */
export function compact<T extends Record<string, unknown>>(vals: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(vals)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Merge the typed convenience fields an action exposes with the free-form
 * `values` escape hatch, so a caller can always set a field the action does not
 * name. Explicit `values` win — they are the more specific instruction.
 */
export function mergeValues(
  typed: Record<string, unknown>,
  extra: unknown,
): Record<string, unknown> {
  const base = compact(typed);
  if (extra === undefined || extra === null || extra === "") return base;
  let parsed: unknown = extra;
  if (typeof extra === "string") {
    try {
      parsed = JSON.parse(extra);
    } catch {
      throw new Error(`Additional values is not valid JSON: ${extra}`);
    }
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Additional values must be a JSON object");
  }
  return { ...base, ...parsed as Record<string, unknown> };
}

/** The `values` escape-hatch Param every create/update action reuses. */
export const VALUES_PARAM: Param = {
  key: "values",
  label: "Additional values",
  type: "json",
  hint: 'JSON object of any other Odoo field to set, e.g. `{"function":"CTO","comment":"VIP"}`. ' +
    "Merged over the fields above, so it can also override them. Use Describe Model to find " +
    "field names.",
};
