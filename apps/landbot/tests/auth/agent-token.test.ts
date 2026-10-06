import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import agentToken, { authHeaders, PROBE_PATH } from "../../auth/agent-token.ts";
import { detailBody, mockCtx } from "../_helpers.ts";

const cred = { token: "abc123def456" };

// deno-lint-ignore no-explicit-any
const test = (c: unknown, ctx: HookContext) => (agentToken.test as any)({ credential: c }, ctx);

Deno.test("auth: declares one apiKey method with a secret field and the Token prefix", () => {
  assertEquals(agentToken.key, "agent-token");
  assertEquals(agentToken.type, "apiKey");
  assertEquals(agentToken.apiKey, { in: "header", name: "Authorization", prefix: "Token " });
  assertEquals(agentToken.fields?.[0].type, "secret");
  assertEquals(PROBE_PATH, "/customers/?limit=1");
});

Deno.test("auth.sign: stamps `Token <token>` with the literal prefix", () => {
  const out = agentToken.sign!({
    request: { url: "https://api.landbot.io/v1/channels/", method: "GET", headers: {} },
    credential: { token: "  k-123  " },
  } as never, mockCtx().ctx) as { headers: Record<string, string> };
  assertEquals(out.headers, { authorization: "Token k-123" });
  assertEquals(authHeaders({}), { authorization: "Token " });
});

Deno.test("auth.test: a customers list passes; the token goes in a header, never the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, total: 0, customers: [] } }]);
  assertEquals(await test(cred, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.landbot.io/v1/customers/?limit=1");
  assertEquals(calls[0].headers["authorization"], "Token abc123def456");
  assertEquals(calls[0].url.includes(cred.token), false);
});

Deno.test("auth.test: a missing token or a pasted `Token ` prefix fails without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await test({ token: "  " }, ctx)).ok, false);
  assertEquals((await test(undefined, ctx)).ok, false);
  const r = await test({ token: "Token abc" }, ctx);
  assertEquals(r.ok, false);
  assert(/prefix/.test(r.message), r.message);
  assertEquals(calls.length, 0);
});

Deno.test("auth.test: a 401 `Invalid token.` is a rejection quoting the vendor's detail", async () => {
  const { ctx } = mockCtx([{ status: 401, body: detailBody("Invalid token.") }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(/Invalid token\./.test(r.message) && /401/.test(r.message), r.message);
});

Deno.test("auth.test: a 200 that is not a customers list does not pass", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>shell</html>", headers: {} }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(/not with a customers list/.test(r.message), r.message);
});

Deno.test("auth.test: a 5xx is not judged as a bad token", async () => {
  const { ctx } = mockCtx([{ status: 503, body: detailBody("down") }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(/not judged/.test(r.message) && !/refused/.test(r.message), r.message);
});
