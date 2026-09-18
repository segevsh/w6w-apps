import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Grant Key (`apiKey`, body-located — and one level deeper than usual).
 *
 * JobTread mints a "grant" (their name for an API credential) from
 * Settings → Grants; the key is shown once at creation. Every Pave request
 * carries it as `query.$.grantKey` **inside the JSON request body** — never
 * an `Authorization` header, never a query string parameter. Confirmed live
 * (2026-09-15): `POST /pave` with `{"query": {"$": {"grantKey": "bad"}, ...}}`
 * answers `"Supplied key is invalid or expired"`; a request with no `$` at
 * all still succeeds structurally (grant-scoped fields just come back `null`)
 * — see `../lib/client.ts` for how shape validation runs independently of
 * the credential.
 *
 * `apiKey: { in: "body", name: "grantKey" }` records the location
 * declaratively for `describe()`/UI purposes, same as every other app in
 * this pack — the runtime never auto-signs from this metadata, `sign` below
 * does the real work. Unlike a flat body credential (e.g. Mandrill's `key` at
 * the body's top level), this one nests TWO levels deep: `sign` has to reach
 * into `body.query.$.grantKey`, not just `body.grantKey` — because `$` is
 * Pave's own convention for "this object's arguments," and `grantKey` is an
 * argument of the query root, not of the request envelope.
 */
const grantKey: AuthDefinition = {
  key: "grant-key",
  type: "apiKey",
  displayName: "Grant Key",
  description:
    "Paste a grant key from JobTread → Settings → Grants. Sent as `query.$.grantKey` in the " +
    "JSON body of every request — JobTread has no header- or query-string-based auth.",
  apiKey: { in: "body", name: "grantKey" },
  fields: [
    {
      key: "grantKey",
      label: "Grant Key",
      type: "secret",
      required: true,
      hint: "JobTread → Settings → Grants → New Grant. The key is shown once at creation time.",
    },
  ],

  sign({ request, credential }) {
    const { grantKey } = credential as { grantKey: string };
    let payload: Record<string, unknown> = {};
    if (request.body) {
      try {
        payload = JSON.parse(request.body) as Record<string, unknown>;
      } catch {
        payload = {};
      }
    }
    const query = (payload.query && typeof payload.query === "object")
      ? payload.query as Record<string, unknown>
      : {};
    const dollar = (query.$ && typeof query.$ === "object")
      ? query.$ as Record<string, unknown>
      : {};
    dollar.grantKey = grantKey;
    query.$ = dollar;
    payload.query = query;
    request.body = JSON.stringify(payload);
    request.headers["content-type"] = "application/json";
    return request;
  },

  // Probe: `currentGrant.id` — "who does this grant belong to," never scoped
  // to any organization/job data, so it needs no permission beyond the grant
  // itself being live. The response body is the ONLY thing classified on:
  // JobTread answers a bad/expired key with a plain-text error string (never
  // JSON, whatever the status code), and a live key with `{"currentGrant":
  // {"id": "..."}}` — an id only, never the key itself, so this never echoes
  // the credential back. `res.ok` is read as a hint, not the verdict; the
  // verdict is "did the body parse as JSON and carry a currentGrant.id".
  async test({ credential }, ctx) {
    const { grantKey } = credential as { grantKey?: string };
    if (!grantKey) return { ok: false, message: "credential missing grantKey" };

    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query: { $: { grantKey }, currentGrant: { id: {} } } }),
    });
    const text = await res.text();

    let body: { currentGrant?: { id?: string } | null };
    try {
      body = JSON.parse(text) as { currentGrant?: { id?: string } | null };
    } catch {
      // Not JSON — this is JobTread's plain-text error shape (bad key, or any
      // other validation failure). Surface the vendor's own message.
      return { ok: false, message: text || `JobTread returned HTTP ${res.status}` };
    }
    if (!body.currentGrant?.id) {
      return { ok: false, message: "grant key did not resolve to a valid grant" };
    }
    return { ok: true };
  },
};

export default grantKey;
