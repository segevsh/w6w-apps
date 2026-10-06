import { assertEquals } from "@std/assert";
import quota, { WARN_REMAINING_FRACTION } from "../../health/quota.ts";
import { mockCtx, type MockResponse, text } from "../_helpers.ts";

const headers = (z1: number, z2: number, l1 = 100, l2 = 100, reset = 600) => ({
  "content-type": "application/json",
  "x-reader-zone1-limit": String(l1),
  "x-reader-zone2-limit": String(l2),
  "x-reader-zone1-usage": String(z1),
  "x-reader-zone2-usage": String(z2),
  "x-reader-limits-reset-after": String(reset),
});

const run = async (r: MockResponse) => {
  const { ctx, calls } = mockCtx([r]);
  return { report: await quota.check!({}, ctx), calls };
};

Deno.test("quota: signed, informational, polled at most every 6 hours", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.minIntervalSeconds, 21600);
  assertEquals(WARN_REMAINING_FRACTION, 0.1);
});

Deno.test("quota: healthy usage reports both zones with a reset instant", async () => {
  const { report, calls } = await run({ body: { userId: "1" }, headers: headers(7, 3) });
  assertEquals(calls[0].url, "https://www.inoreader.com/reader/api/0/user-info");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.map((q) => [q.id, q.limit, q.remaining]), [
    ["zone1-reads", 100, 93],
    ["zone2-writes", 100, 97],
  ]);
  assertEquals(typeof report.quota?.[0].resetAt, "string");
});

Deno.test("quota: <=10% left is degraded, an empty zone is down", async () => {
  const low = await run({ body: { userId: "1" }, headers: headers(95, 0) });
  assertEquals(low.report.state, "degraded");
  const empty = await run({ body: { userId: "1" }, headers: headers(10, 100) });
  assertEquals(empty.report.state, "down");
});

Deno.test("quota: no headers or a failed call is unknown", async () => {
  assertEquals((await run({ body: { userId: "1" } })).report.state, "unknown");
  assertEquals((await run(text("Error=x", 401))).report.state, "unknown");
});
