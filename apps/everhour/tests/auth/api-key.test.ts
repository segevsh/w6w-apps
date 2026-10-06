import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

const USER = { id: 1304, name: "Chris Wonder", role: "admin", status: "active" };
const cred = { apiKey: "abcd-efgh-1234567-7890ab-cdefgh12" };

// deno-lint-ignore no-explicit-any
const test = (c: unknown, ctx: HookContext) => (apiKey.test as any)({ credential: c }, ctx);

Deno.test("auth: declares one apiKey method with a secret field and an X-Api-Key header", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "header", name: "X-Api-Key" });
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(PROBE_PATH, "/users/me");
});

Deno.test("auth.sign: stamps X-Api-Key and nothing else", () => {
  const out = apiKey.sign!({
    request: { url: "https://api.everhour.com/x", method: "GET", headers: {} },
    credential: { apiKey: "  k-123  " },
  } as never, mockCtx().ctx) as { headers: Record<string, string> };
  assertEquals(out.headers, { "x-api-key": "k-123" });
  assertEquals(authHeaders({}), { "x-api-key": "" });
});

Deno.test("auth.test: a 200 user object passes and sends the key as a header, never in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  assertEquals(await test(cred, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.everhour.com/users/me");
  assertEquals(calls[0].headers["x-api-key"], cred.apiKey);
  assertEquals(calls[0].url.includes(cred.apiKey), false);
});

Deno.test("auth.test: a missing apiKey fails without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await test({ apiKey: "  " }, ctx)).ok, false);
  assertEquals((await test(undefined, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth.test: 403 'Access denied' is a rejection that names both causes", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Access denied") }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(/Access denied/.test(r.message) && /missing and a wrong key/.test(r.message), r.message);
});

Deno.test("auth.test: a 200 that is not a user object is NOT a pass", async () => {
  const { ctx } = mockCtx([{
    body: "<html>spa shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  const { ctx: ctx2 } = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await test(cred, ctx2)).ok, false);
});

Deno.test("auth.test: 429 is reported as undecided, 5xx as an HTTP failure", async () => {
  const limited = mockCtx([{ status: 429, body: errorBody(429, "slow down") }]);
  const a = await test(cred, limited.ctx);
  assertEquals(a.ok, false);
  assert(/rate-limited/.test(a.message), a.message);
  const down = mockCtx([{ status: 503, body: "oops", headers: {} }]);
  assert(/HTTP 503/.test((await test(cred, down.ctx)).message));
});

Deno.test("auth.afterConnect: keeps only name and id, drops everything else", async () => {
  const { ctx } = mockCtx([{ body: { ...USER, email: "a@b.c", apiKey: "SECRET" } }]);
  const out = await apiKey.afterConnect!({ credential: cred } as never, ctx);
  assertEquals(out, { name: "Chris Wonder", userId: 1304 });
});

Deno.test("auth.afterConnect: failures are silent", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Access denied") }]);
  assertEquals(await apiKey.afterConnect!({ credential: cred } as never, ctx), {});
  const boom = {
    fetch: () => Promise.reject(new Error("net")),
    log: () => {},
  } as unknown as HookContext;
  assertEquals(await apiKey.afterConnect!({ credential: cred } as never, boom), {});
});
