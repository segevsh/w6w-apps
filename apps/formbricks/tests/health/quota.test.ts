import { assertEquals } from "@std/assert";
import quota, { PROBE_URL, readHeaders } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const hdr = (limit: string, remaining: string) => ({
  "content-type": "application/json",
  "x-ratelimit-limit": limit,
  "x-ratelimit-remaining": remaining,
  "x-ratelimit-reset": "52",
});

const run = async (r: Parameters<typeof mockCtx>[0]) => {
  const { ctx, calls } = mockCtx(r);
  return { out: await quota.check!({}, ctx), calls };
};

Deno.test("readHeaders: parses the leading integer of `100, 100;w=60`", () => {
  const h = new Headers({ "x-ratelimit-limit": "100, 100;w=60", "x-ratelimit-remaining": "99" });
  assertEquals(readHeaders(h), { limit: 100, remaining: 99 });
  assertEquals(readHeaders(new Headers()), { limit: undefined, remaining: undefined });
});

Deno.test("quota: plenty left is ok and reports the quota entry", async () => {
  const { out, calls } = await run([{ body: { id: "e" }, headers: hdr("100, 100;w=60", "99") }]);
  assertEquals(out.state, "ok");
  assertEquals(out.quota, [
    { id: "per-minute-requests", limit: 100, remaining: 99, unit: "requests" },
  ]);
  assertEquals(calls[0].url, PROBE_URL);
});

Deno.test("quota: nearly spent is degraded, spent is down", async () => {
  assertEquals(
    (await run([{ body: {}, headers: hdr("100, 100;w=60", "9") }])).out.state,
    "degraded",
  );
  assertEquals((await run([{ body: {}, headers: hdr("100, 100;w=60", "0") }])).out.state, "down");
});

Deno.test("quota: 429 is down; a rejected key or missing headers are unknown", async () => {
  assertEquals((await run([{ status: 429, body: {} }])).out.state, "down");
  assertEquals((await run([{ status: 401, body: {} }])).out.state, "unknown");
  assertEquals((await run([{ body: {} }])).out.state, "unknown");
});

Deno.test("quota: connection-scoped and signed", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});
