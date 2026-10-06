import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import apiToken, { authHeaders, PROBE_PATH, PROBE_QUERY } from "../../auth/api-token.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

const cred = { apiToken: "tok-1234567890abcdef", organizationId: "4242" };
const OK = { data: [{ id: "1", type: "projects", attributes: { name: "P" } }] };

// deno-lint-ignore no-explicit-any
const test = (c: unknown, ctx: HookContext) => (apiToken.test as any)({ credential: c }, ctx);

Deno.test("auth: one apiKey method, a secret token and an organization id", () => {
  assertEquals(apiToken.key, "api-token");
  assertEquals(apiToken.type, "apiKey");
  assertEquals(apiToken.apiKey, { in: "header", name: "X-Auth-Token" });
  assertEquals(apiToken.fields?.map((f) => [f.key, f.type]), [
    ["apiToken", "secret"],
    ["organizationId", "string"],
  ]);
  assertEquals(PROBE_PATH + PROBE_QUERY, "/projects?page[size]=1");
});

Deno.test("auth.sign: stamps both headers, trimmed, and nothing else", () => {
  const out = apiToken.sign!({
    request: { url: "https://api.productive.io/x", method: "GET", headers: {} },
    credential: { apiToken: "  k-1  ", organizationId: 77 },
  } as never, mockCtx().ctx) as { headers: Record<string, string> };
  assertEquals(out.headers, { "x-auth-token": "k-1", "x-organization-id": "77" });
  assertEquals(authHeaders({}), { "x-auth-token": "", "x-organization-id": "" });
});

Deno.test("auth.test: a 2xx collection passes; the token is a header, never in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  assertEquals(await test(cred, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.productive.io/api/v2/projects?page[size]=1");
  assertEquals(calls[0].headers["x-auth-token"], cred.apiToken);
  assertEquals(calls[0].headers["x-organization-id"], cred.organizationId);
  assertEquals(calls[0].url.includes(cred.apiToken), false);
});

Deno.test("auth.test: a missing token or organization fails without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await test({ apiToken: "  ", organizationId: "1" }, ctx)).ok, false);
  assertEquals((await test({ apiToken: "t", organizationId: "" }, ctx)).ok, false);
  assertEquals((await test(undefined, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth.test: invalid_auth_token is a rejection, and the message never echoes the token", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("401", "invalid_auth_token", "Unauthenticated"),
  }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(/invalid_auth_token/.test(r.message) && /missing and a wrong token/.test(r.message));
  assertEquals(r.message.includes(cred.apiToken), false);
});

Deno.test("auth.test: a 403 is reported with the vendor words, not guessed as a bad token", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("403", "access_denied", "Access Denied"),
  }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(/403/.test(r.message) && /Access Denied/.test(r.message), r.message);
  assert(!/does not accept this API token/.test(r.message), r.message);
});

Deno.test("auth.test: a 200 that is not a JSON:API collection is NOT a pass", async () => {
  const html = mockCtx([{ body: "<html>shell</html>", headers: { "content-type": "text/html" } }]);
  assertEquals((await test(cred, html.ctx)).ok, false);
  const other = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await test(cred, other.ctx)).ok, false);
});

Deno.test("auth.test: 429 is reported as undecided, a 5xx as a refusal", async () => {
  const limited = mockCtx([{ status: 429, body: errorBody("429", "rate_limit", "Too Many") }]);
  const a = await test(cred, limited.ctx);
  assertEquals(a.ok, false);
  assert(/rate-limited/.test(a.message), a.message);
  const down = mockCtx([{ status: 503, body: "oops", headers: {} }]);
  const b = await test(cred, down.ctx);
  assertEquals(b.ok, false);
  assert(/503/.test(b.message), b.message);
});
