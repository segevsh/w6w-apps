import { assertEquals } from "@std/assert";
import quota, { parseResetAt, PROBE_URL, readHeadroom } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const h = (o: Record<string, string>) => new Headers(o);

Deno.test("quota: healthy headroom is ok and reports the bucket", () => {
  const r = readHeadroom(h({
    "x-ratelimit-limit": "50",
    "x-ratelimit-remaining": "49",
    "x-ratelimit-reset": "1791309420",
  }));
  assertEquals(r.state, "ok");
  assertEquals(r.quota?.[0].limit, 50);
  assertEquals(r.quota?.[0].remaining, 49);
  assertEquals(r.quota?.[0].resetAt, new Date(1791309420 * 1000).toISOString());
});

Deno.test("quota: nearly spent and exhausted are degraded", () => {
  assertEquals(
    readHeadroom(h({ "x-ratelimit-limit": "50", "x-ratelimit-remaining": "5" })).state,
    "degraded",
  );
  assertEquals(
    readHeadroom(h({ "x-ratelimit-limit": "50", "x-ratelimit-remaining": "0" })).state,
    "degraded",
  );
});

Deno.test("quota: missing or malformed headers are unknown, never ok", () => {
  assertEquals(readHeadroom(h({})).state, "unknown");
  assertEquals(
    readHeadroom(h({ "x-ratelimit-limit": "0", "x-ratelimit-remaining": "0" })).state,
    "unknown",
  );
  assertEquals(parseResetAt("nope"), undefined);
});

Deno.test("quota: check probes the fields endpoint; 401 is unknown, 429 is degraded", async () => {
  const { ctx, calls } = mockCtx([
    { body: [], headers: { "x-ratelimit-limit": "50", "x-ratelimit-remaining": "40" } },
    { status: 401 },
    { status: 429, headers: { "x-ratelimit-limit": "50", "x-ratelimit-remaining": "0" } },
  ]);
  assertEquals((await quota.check!({} as never, ctx)).state, "ok");
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals((await quota.check!({} as never, ctx)).state, "unknown");
  assertEquals((await quota.check!({} as never, ctx)).state, "degraded");
  assertEquals(quota.severity, "informational");
});
