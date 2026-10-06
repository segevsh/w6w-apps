import { assertEquals } from "@std/assert";
import apiKey, { probeRequest } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const credential = { apiKey: "key_abc123" };

Deno.test("api-key: sign stamps a trimmed bearer header", async () => {
  const req = await apiKey.sign!({
    request: { url: "https://api.dev.runwayml.com/v1/organization", method: "GET", headers: {} },
    credential: { apiKey: "  key_abc123 " },
  }, mockCtx().ctx);
  assertEquals(req.headers.authorization, "Bearer key_abc123");
});

Deno.test("api-key: test passes only on a body carrying creditBalance, and sends the version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { creditBalance: 10, tier: {}, usage: {} } }]);
  assertEquals(await apiKey.test({ credential }, ctx), { ok: true });
  assertEquals(calls[0].url, probeRequest().url);
  assertEquals(calls[0].headers.authorization, "Bearer key_abc123");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  // a 200 that is not Runway's organization body is not a pass
  const odd = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await apiKey.test({ credential }, odd.ctx)).ok, false);
});

Deno.test("api-key: a 401 is a rejected secret; 429 and 5xx are reported distinctly", async () => {
  const bad = mockCtx([{ status: 401, body: { error: "The provided API key is not valid." } }]);
  const r = await apiKey.test({ credential }, bad.ctx);
  assertEquals(r.ok, false);
  assertEquals(r.message!.includes("rejected the API secret"), true);
  assertEquals(r.message!.includes(credential.apiKey), false);
  const rl = await apiKey.test({ credential }, mockCtx([{ status: 429, body: {} }]).ctx);
  assertEquals(rl.message!.includes("429"), true);
  const down = await apiKey.test(
    { credential },
    mockCtx([{ status: 503, body: { error: "busy" } }]).ctx,
  );
  assertEquals(down.message!.includes("HTTP 503"), true);
});

Deno.test("api-key: a missing secret fails without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await apiKey.test({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});
