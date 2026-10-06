import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errBody, mockCtx } from "../_helpers.ts";

const cred = { apiKey: "absk-abc123def456" };
const ok = { success: true, data: { status: "ok", token: "absk-........f456" } };

// deno-lint-ignore no-explicit-any
const test = (c: unknown, ctx: HookContext) => (apiKey.test as any)({ credential: c }, ctx);

Deno.test("auth: declares one apiKey method with a secret field and the Bearer prefix", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "header", name: "Authorization", prefix: "Bearer " });
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(PROBE_PATH, "/status");
});

Deno.test("auth.sign: stamps `Bearer <key>`", () => {
  const out = apiKey.sign!({
    request: { url: "https://api.aidbase.ai/v1/knowledge", method: "GET", headers: {} },
    credential: { apiKey: "  k-123  " },
  } as never, mockCtx().ctx) as { headers: Record<string, string> };
  assertEquals(out.headers, { authorization: "Bearer k-123" });
  assertEquals(authHeaders({}), { authorization: "Bearer " });
});

Deno.test("auth.test: a status ok body passes; the key goes in a header, never the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: ok }]);
  assertEquals(await test(cred, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.aidbase.ai/v1/status");
  assertEquals(calls[0].headers["authorization"], "Bearer absk-abc123def456");
  assertEquals(calls[0].url.includes(cred.apiKey), false);
});

Deno.test("auth.test: a missing key or a pasted `Bearer ` prefix fails without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await test({ apiKey: "  " }, ctx)).ok, false);
  assertEquals((await test(undefined, ctx)).ok, false);
  const r = await test({ apiKey: "Bearer abc" }, ctx);
  assertEquals(r.ok, false);
  assert(/prefix/.test(r.message), r.message);
  assertEquals(calls.length, 0);
});

Deno.test("auth.test: a 401 `invalid` is a rejection quoting the vendor's message", async () => {
  const msg = "Failed to authorize the user. The API key is invalid.";
  const { ctx } = mockCtx([{ status: 401, body: errBody(msg) }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(r.message.includes("API key is invalid") && /401/.test(r.message), r.message);
});

Deno.test("auth.test: a 200 that is not the status document does not pass", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>shell</html>", headers: {} }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(/documented \/status/.test(r.message), r.message);
  const other = mockCtx([{ body: { success: true, data: { status: "down" } } }]);
  assertEquals((await test(cred, other.ctx)).ok, false);
});

Deno.test("auth.test: a 5xx is not judged as a bad key", async () => {
  const { ctx } = mockCtx([{ status: 503, body: errBody("unavailable") }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(/not judged/.test(r.message) && !/refused/.test(r.message), r.message);
});
