import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const run = async (headers: Record<string, string>, status = 200) =>
  await quota.check!({} as never, mockCtx([{ status, headers, body: {} }]).ctx);

Deno.test("quota: plenty left is ok and carries the window", async () => {
  const out = await run({
    "x-ratelimit-limit": "120",
    "x-ratelimit-remaining": "100",
    "x-ratelimit-reset": "30",
  });
  assertEquals(out.state, "ok");
  assertEquals(out.quota![0].limit, 120);
  assertEquals(out.quota![0].remaining, 100);
  assertEquals(typeof out.quota![0].resetAt, "string");
});

Deno.test("quota: under 10% is degraded, zero is down", async () => {
  assertEquals(
    (await run({ "x-ratelimit-limit": "120", "x-ratelimit-remaining": "5" })).state,
    "degraded",
  );
  assertEquals(
    (await run({ "x-ratelimit-limit": "120", "x-ratelimit-remaining": "0" })).state,
    "down",
  );
});

Deno.test("quota: missing headers or a failed probe are unknown", async () => {
  assertEquals((await run({})).state, "unknown");
  assertEquals((await run({}, 401)).state, "unknown");
});

Deno.test("quota: informational and signed", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.credential, "signed");
});
