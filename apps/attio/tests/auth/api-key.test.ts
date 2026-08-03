import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import apiKey, { authHeaders, parseScopes } from "../../auth/api-key.ts";

const CRED = { accessToken: "a".repeat(64) };

/** The active-token arm of `/v2/self`, as the OpenAPI document declares it. */
const ACTIVE = {
  active: true,
  scope: "record_permission:read-write object_configuration:read",
  client_id: "app-1",
  token_type: "Bearer",
  exp: null,
  iat: 1700000000,
  sub: "w1",
  aud: "app-1",
  iss: "attio.com",
  authorized_by_workspace_member_id: "m1",
  workspace_id: "w1",
  workspace_name: "Acme",
  workspace_slug: "acme",
  workspace_logo_url: null,
};

Deno.test("auth: declares a bearer method with a single secret field", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "bearer");
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].key, "accessToken");
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(apiKey.fields?.[0].required, true);
});

Deno.test("authHeaders: builds exactly `Bearer <token>`", () => {
  assertEquals(authHeaders(CRED), { authorization: `Bearer ${"a".repeat(64)}` });
});

Deno.test("sign: stamps the bearer header onto the request and returns it", () => {
  const request = {
    url: "https://api.attio.com/v2/objects",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: CRED } as never,
    {} as never,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], `Bearer ${"a".repeat(64)}`);
});

/** `sign` is the only hook handed the credential, and it must not do network I/O. */
Deno.test("sign: makes no network call", () => {
  const { ctx, calls } = mockCtx([]);
  apiKey.sign!(
    {
      request: { url: "https://api.attio.com/v2/objects", headers: {} },
      credential: CRED,
    } as never,
    ctx as never,
  );
  assertEquals(calls.length, 0);
});

/*
 * ── test: the 200-that-means-failure ─────────────────────────────────────────
 */

Deno.test("test: probes GET /v2/self with the bearer header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: ACTIVE }]);
  const result = await apiKey.test({ credential: CRED }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://api.attio.com/v2/self");
  assertEquals(calls[0].headers["authorization"], `Bearer ${"a".repeat(64)}`);
});

/**
 * The core of this app's auth. Verified on the wire, 2026-08-03: a well-formed
 * but unknown 64-character token gets `HTTP 200 {"active":false}` — never a 401.
 * A `res.ok` check would pass here.
 */
Deno.test("test: FAILS on the HTTP 200 `{active:false}` body", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { active: false } }]);
  const result = await apiKey.test({ credential: CRED }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("inactive"), result.message);
  assert(result.message!.includes("revoked"), result.message);
});

/**
 * Also on the wire: a token Attio cannot even parse gets a 400, not a 401, with
 * `{"code":"missing_value","message":"Token was not recognised…"}`. It deserves
 * a different sentence — "your key is truncated" rather than "your key is dead".
 */
Deno.test("test: explains the 400 that a malformed token gets", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      status_code: 400,
      type: "invalid_request_error",
      code: "missing_value",
      message: "Token was not recognised, …",
    },
  }]);
  const result = await apiKey.test({ credential: { accessToken: "nope" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("64 characters"), result.message);
});

/**
 * A live token with no scopes returns `active: true` and then 403s on every
 * call. Reporting it green would send someone hunting the wrong problem.
 */
Deno.test("test: fails an active token that was granted no scopes", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { ...ACTIVE, scope: "" } }]);
  const result = await apiKey.test({ credential: CRED }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("no scopes"), result.message);
});

Deno.test("test: fails without a network call when the credential is empty", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);
  assertEquals(result, { ok: false, message: "credential missing accessToken" });
  assertEquals(calls.length, 0);
});

Deno.test("test: surfaces the vendor message on any other non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { message: "Internal error" } }]);
  const result = await apiKey.test({ credential: CRED }, ctx);
  assertEquals(result, { ok: false, message: "Internal error" });
});

Deno.test("test: an unreadable body is reported as such, not as success", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "not json",
    headers: { "content-type": "text/plain" },
  }]);
  const result = await apiKey.test({ credential: CRED }, ctx);
  assertEquals(result.ok, false);
});

/*
 * ── afterConnect ─────────────────────────────────────────────────────────────
 */

Deno.test("afterConnect: labels the connection with the workspace and records the scopes", async () => {
  const { ctx } = mockCtx([{ status: 200, body: ACTIVE }]);
  const display = await apiKey.afterConnect!({ credential: CRED } as never, ctx) as {
    workspace: { id: string; name: string; slug: string };
    token: { scopes: string[]; expiresAt: number | null; authorizedBy: string };
  };

  assertEquals(display.workspace, { id: "w1", name: "Acme", slug: "acme" });
  assertEquals(display.token.scopes, [
    "record_permission:read-write",
    "object_configuration:read",
  ]);
  // A workspace API key has no expiry; null is the normal reading, not a gap.
  assertEquals(display.token.expiresAt, null);
  assertEquals(apiKey.connectionLabel, "{{workspace.name}}");
});

Deno.test("afterConnect: returns nothing rather than half a label on an inactive token", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { active: false } }]);
  assertEquals(await apiKey.afterConnect!({ credential: CRED } as never, ctx), {});
});

Deno.test("afterConnect: returns nothing on a transport failure", async () => {
  const { ctx } = mockCtx([{ status: 503, body: {} }]);
  assertEquals(await apiKey.afterConnect!({ credential: CRED } as never, ctx), {});
});

/**
 * `/v2/self` is safe precisely because its fifteen fields are claims ABOUT the
 * token. This pins the fact that none of them ends up in stored display data —
 * the failure mode being a live credential rendered in a Connection UI.
 */
Deno.test("afterConnect: stores nothing that could be a credential", async () => {
  const { ctx } = mockCtx([{ status: 200, body: ACTIVE }]);
  const display = await apiKey.afterConnect!({ credential: CRED } as never, ctx);
  const serialised = JSON.stringify(display);
  assert(!serialised.includes("a".repeat(64)), "the access token leaked into display data");
  assert(!/access_?token|client_?secret|api_?key/i.test(serialised), serialised);
});

/*
 * ── scopes ───────────────────────────────────────────────────────────────────
 */

Deno.test("parseScopes: splits on whitespace and drops empties", () => {
  assertEquals(parseScopes("a b  c"), ["a", "b", "c"]);
  assertEquals(parseScopes(""), []);
  assertEquals(parseScopes(undefined), []);
});

Deno.test("auth: the field hint names the scopes this app's actions need", () => {
  const hint = apiKey.fields![0].hint!;
  for (
    const scope of [
      "record_permission:read-write",
      "object_configuration:read",
      "list_entry:read-write",
      "list_configuration:read",
      "note:read-write",
      "task:read-write",
      "user_management:read",
    ]
  ) {
    assert(hint.includes(scope), `hint omits ${scope}`);
  }
});
