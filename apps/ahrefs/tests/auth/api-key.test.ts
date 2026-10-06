import { assertEquals } from "@std/assert";
import apiKey, { probeRequest } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const credential = { apiKey: "  k123  " };
const usage = { limits_and_usage: { subscription: "Standard", units_usage_api_key: 5 } };

Deno.test("sign: stamps a trimmed bearer key", async () => {
  const { ctx } = mockCtx();
  const out = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
  assertEquals(out.headers["authorization"], "Bearer k123");
});

Deno.test("test: ok on a limits_and_usage body, probing the free endpoint with the key", async () => {
  const { ctx, calls } = mockCtx([{ body: usage }]);
  assertEquals(await apiKey.test!({ credential }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.ahrefs.com/v3/subscription-info/limits-and-usage");
  assertEquals(calls[0].headers["authorization"], "Bearer k123");
});

Deno.test("test: a 200 without limits_and_usage is not ok", async () => {
  const { ctx } = mockCtx([{ body: { hello: 1 } }]);
  assertEquals((await apiKey.test!({ credential }, ctx)).ok, false);
});

Deno.test("test: Unauthorized and Forbidden bodies are reported as a rejected key", async () => {
  for (const [status, label] of [[401, "Unauthorized"], [403, "Forbidden"]] as const) {
    const { ctx } = mockCtx([{ status, body: ["Error", label] }]);
    const r = await apiKey.test!({ credential }, ctx);
    assertEquals(r.ok, false);
    assertEquals(r.message?.includes(`rejected the API key (${label})`), true);
  }
});

Deno.test("test: missing key short-circuits; 429, 5xx and unknown errors are explained", async () => {
  const none = mockCtx();
  assertEquals((await apiKey.test!({ credential: {} }, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
  const rl = mockCtx([{ status: 429, body: ["Error", "Too Many Requests"] }]);
  assertEquals((await apiKey.test!({ credential }, rl.ctx)).message?.includes("429"), true);
  const down = mockCtx([{ status: 503, body: "x" }]);
  assertEquals((await apiKey.test!({ credential }, down.ctx)).message?.includes("503"), true);
  const odd = mockCtx([{ status: 400, body: { error: "weird" } }]);
  assertEquals((await apiKey.test!({ credential }, odd.ctx)).message?.includes("(weird)"), true);
});

Deno.test("afterConnect: labels the connection with the plan, falls back on failure", async () => {
  const ok = mockCtx([{ body: usage }]);
  assertEquals(await apiKey.afterConnect!({ credential }, ok.ctx), { subscription: "Standard" });
  const bad = mockCtx([{ status: 401, body: ["Error", "Unauthorized"] }]);
  assertEquals(await apiKey.afterConnect!({ credential }, bad.ctx), { subscription: "Ahrefs" });
});
