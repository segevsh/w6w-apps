import { assertEquals } from "@std/assert";
import thresholdInfo from "../../actions/threshold-info.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://webservices2.autotask.net/atservicesrest/V1.0";
const display = { display: { zone: "2" } };
const run = (a: { execute?: unknown }, input: unknown, ctx: unknown) =>
  (a.execute as (i: unknown, c: unknown) => Promise<Record<string, unknown>>)(input, ctx);

Deno.test("threshold-info: maps the three figures and computes the remainder", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      externalRequestThreshold: 10000,
      requestThresholdTimeframe: 60,
      currentTimeframeRequestCount: 250,
    },
  }], display);
  assertEquals(await run(thresholdInfo, {}, ctx), {
    limit: 10000,
    used: 250,
    remaining: 9750,
    timeframe: 60,
  });
  assertEquals(calls[0].url, `${BASE}/ThresholdInformation`);
});
