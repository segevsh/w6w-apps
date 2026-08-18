import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";
import { PRODUCTION } from "../../lib/client.ts";

/**
 * Deel has a Statuspage and does not publish it — the 401 is Statuspage's own
 * message for an unpublished page, so there is nothing to probe.
 */
Deno.test("service: is a declared absence, with the private-page evidence", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined);
  assert(service.unavailable?.reason.includes("inactive"));
  assertEquals(service.severity, "informational");
  // Nothing is fetched, so no egress is widened.
  assertEquals(service.network, undefined);
});

const headers = (remaining: number, limit = 100) => ({
  "content-type": "application/json",
  "x-ratelimit-limit": String(limit),
  "x-ratelimit-remaining": String(remaining),
  "x-ratelimit-reset": "1787044307",
});

Deno.test("quota: is a live check — Deel sends the headers on every response", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
  assert(typeof quota.check === "function");
});

Deno.test("quota: reads the allowance and converts the epoch-seconds reset", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {}, headers: headers(97) }], {
    display: {},
  });
  const result = await quota.check!({} as never, ctx) as {
    state: string;
    quota: Array<Record<string, unknown>>;
  };
  assertEquals(calls[0].url, `${PRODUCTION}/contracts?limit=1`);
  assertEquals(result.state, "ok");
  assertEquals(result.quota[0].limit, 100);
  assertEquals(result.quota[0].remaining, 97);
  assertEquals(result.quota[0].resetAt, "2026-08-18T09:11:47.000Z");
});

/** The headers ride on error responses too, which is when they matter most. */
Deno.test("quota: reads the headers off a 429 as well", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "", headers: headers(0) }], { display: {} });
  assertEquals((await quota.check!({} as never, ctx) as { state: string }).state, "down");
});

Deno.test("quota: under 10% headroom degrades", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {}, headers: headers(5) }], { display: {} });
  assertEquals((await quota.check!({} as never, ctx) as { state: string }).state, "degraded");
});

Deno.test("quota: no headers is unknown, and says which kind of nothing it got", async () => {
  const ok = mockCtx([{ status: 200, body: {} }], { display: {} });
  const a = await quota.check!({} as never, ok.ctx) as { state: string; message: string };
  assertEquals(a.state, "unknown");
  assertEquals(a.message, "response carried no x-ratelimit-* headers");

  const failed = mockCtx([{ status: 500, body: "" }], { display: {} });
  const b = await quota.check!({} as never, failed.ctx) as { state: string; message: string };
  assertEquals(b.message, "quota probe returned 500");
});
