import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const hdr = (limit: string, remaining: string, reset = "30") => ({
  "content-type": "application/json",
  "ratelimit-limit": limit,
  "ratelimit-remaining": remaining,
  "ratelimit-reset": reset,
});

const run = (r: Parameters<typeof mockCtx>[0]) =>
  quota.check!({} as never, mockCtx(r).ctx) as Promise<
    { state: string; message?: string; quota?: Array<Record<string, unknown>> }
  >;

Deno.test("quota: plenty of headroom is ok and carries the bucket", async () => {
  const r = await run([{ body: {}, headers: hdr("2000", "1900") }]);
  assertEquals(r.state, "ok");
  assertEquals(r.quota?.[0].limit, 2000);
  assertEquals(r.quota?.[0].remaining, 1900);
  assert(typeof r.quota?.[0].resetAt === "string");
});

Deno.test("quota: 10% or less remaining is degraded", async () => {
  const r = await run([{ body: {}, headers: hdr("2000", "200") }]);
  assertEquals(r.state, "degraded");
});

Deno.test("quota: zero remaining is degraded, not down", async () => {
  const r = await run([{ body: {}, headers: hdr("2000", "0") }]);
  assertEquals(r.state, "degraded");
  assert(r.message?.includes("exhausted"));
});

Deno.test("quota: missing headers are unknown", async () => {
  const r = await run([{ body: {}, headers: { "content-type": "application/json" } }]);
  assertEquals(r.state, "unknown");
});

Deno.test("quota: a non-2xx probe is unknown, never degraded", async () => {
  const r = await run([{ status: 401, body: { error: "INVALID_API_KEY" } }]);
  assertEquals(r.state, "unknown");
});

Deno.test("quota: probes GET /me and declares a signed connection check", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.kind, "quota");
});
