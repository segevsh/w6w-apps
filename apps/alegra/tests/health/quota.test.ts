import { assertEquals } from "@std/assert";
import quota, { headroom } from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => quota.check!({} as never, ctx);

Deno.test("quota: is signed, connection-scoped and informational", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: reads X-Rate-Limit-* off a GET /terms and treats Reset as a delay in seconds", async () => {
  const { ctx, calls } = mockCtx([{
    body: [],
    headers: {
      "content-type": "application/json",
      "x-rate-limit-limit": "150",
      "x-rate-limit-remaining": "120",
      "x-rate-limit-reset": "40",
    },
  }]);
  const before = Date.now();
  const r = await run(ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/terms");
  assertEquals(r.state, "ok");
  const q = r.quota![0];
  assertEquals([q.limit, q.remaining, q.unit], [150, 120, "requests"]);
  const resetMs = Date.parse(q.resetAt!);
  assertEquals(resetMs >= before + 40_000 && resetMs <= Date.now() + 40_000, true);
});

Deno.test("quota: under 10% left is degraded, none left is down", async () => {
  const h = (rem: string) => ({
    "content-type": "application/json",
    "x-rate-limit-limit": "150",
    "x-rate-limit-remaining": rem,
  });
  assertEquals((await run(mockCtx([{ body: [], headers: h("10") }]).ctx)).state, "degraded");
  assertEquals((await run(mockCtx([{ body: [], headers: h("0") }]).ctx)).state, "down");
});

Deno.test("quota: no header means unknown, never a guessed ok", async () => {
  const r = await run(mockCtx([{ body: [] }]).ctx);
  assertEquals(r.state, "unknown");
  assertEquals(r.quota, undefined);
});

Deno.test("headroom: boundaries", () => {
  assertEquals(headroom(undefined, 150), "unknown");
  assertEquals(headroom(15, 150), "ok");
  assertEquals(headroom(14, 150), "degraded");
  assertEquals(headroom(5, undefined), "ok");
});
