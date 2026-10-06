import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

const cred = { apiKey: "abcd-efgh-1234567-7890ab-cdefgh12" };

// deno-lint-ignore no-explicit-any
const test = (c: unknown, ctx: HookContext) => (apiKey.test as any)({ credential: c }, ctx);

Deno.test("auth: declares one apiKey method with a secret field and a userApiKey header", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "header", name: "userApiKey" });
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(PROBE_PATH, "/api/v2/languages");
});

Deno.test("auth.sign: stamps userApiKey and nothing else", () => {
  const out = apiKey.sign!({
    request: { url: "https://axonaut.com/api/v2/x", method: "GET", headers: {} },
    credential: { apiKey: "  k-123  " },
  } as never, mockCtx().ctx) as { headers: Record<string, string> };
  assertEquals(out.headers, { userapikey: "k-123" });
  assertEquals(authHeaders({}), { userapikey: "" });
});

Deno.test("auth.test: a 200 list passes and sends the key as a header, never in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: ["fr", "en"] }]);
  assertEquals(await test(cred, ctx), { ok: true });
  assertEquals(calls[0].url, "https://axonaut.com/api/v2/languages");
  assertEquals(calls[0].headers["userapikey"], cred.apiKey);
  assertEquals(calls[0].url.includes(cred.apiKey), false);
});

Deno.test("auth.test: a missing apiKey fails without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await test({ apiKey: "  " }, ctx)).ok, false);
  assertEquals((await test(undefined, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth.test: 403 'Forbidden access' is a rejection that quotes the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(/Forbidden access/.test(r.message), r.message);
});

Deno.test("auth.test: a 400 missing-header body is a rejection too", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody(400, "Bad request - Missing header") }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(/Missing header/.test(r.message), r.message);
});

Deno.test("auth.test: a 200 that is not a list is NOT a pass", async () => {
  const html = mockCtx([{
    body: "<html>spa shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await test(cred, html.ctx)).ok, false);
  const obj = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await test(cred, obj.ctx)).ok, false);
});

Deno.test("auth.test: 429 is reported as undecided, 5xx as an HTTP failure", async () => {
  const limited = mockCtx([{ status: 429, body: errorBody(429, "slow down") }]);
  const a = await test(cred, limited.ctx);
  assertEquals(a.ok, false);
  assert(/rate-limited/.test(a.message), a.message);
  const down = mockCtx([{ status: 503, body: "oops", headers: {} }]);
  assert(/HTTP 503/.test((await test(cred, down.ctx)).message));
});
