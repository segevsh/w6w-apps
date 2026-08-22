import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

const withHeaders = (remaining: number, allowance = 500) => ({
  status: 200,
  body: [],
  headers: {
    "content-type": "application/json",
    ratelimit: `"api";r=${remaining};t=170`,
    "ratelimit-policy": `"fixed window";"api";q=${allowance};w=300`,
  },
});

/** The headers are named nothing like the usual ones. */
Deno.test("quota: reads the RFC-draft headers off a cheap unauthenticated call", async () => {
  const { ctx, calls } = mockCtx([withHeaders(494)]);
  const result = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://huggingface.co/api/models?limit=1");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result.state, "ok");
  assert(/494 of 500/.test(result.message!), result.message);
  assert(/per 300s/.test(result.message!), result.message);
  assert(/resetting in 170s/.test(result.message!), result.message);
});

Deno.test("quota: running low is degraded, exhausted is down", async () => {
  const low = mockCtx([withHeaders(40)]);
  assertEquals((await quota.check!({}, low.ctx)).state, "degraded");

  const gone = mockCtx([withHeaders(0)]);
  const result = await quota.check!({}, gone.ctx);
  assertEquals(result.state, "down");
  assert(/Hub calls are being refused/.test(result.message!), result.message);
});

/** A proxy forwarding only known headers strips these. */
Deno.test("quota: absent headers are unknown, and say why they might be", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/not X-RateLimit-\*/.test(result.message!), result.message);
  assert(/strips them/.test(result.message!), result.message);
});

Deno.test("quota: an unreachable Hub is unknown", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof quota.check>>[1];
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

/** The providers have their own limits, reported in their own way or not at all. */
Deno.test("quota: says it measures the Hub only", () => {
  assert(/says nothing about the inference providers/.test(quota.description!), quota.description);
  assertEquals(quota.credential, "context");
});
