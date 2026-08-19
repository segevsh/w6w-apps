import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sim-list.ts";

const sims = {
  status: 200,
  body: {
    sims: [
      { iccid: "89011", status: "active", mb_used: 12.5 },
      { iccid: "89012", status: "active", mb_used: 480.0 },
      { iccid: "89013", status: "active_over_limit", mb_used: 1024.0 },
      { iccid: "89014", status: "inactive", mb_used: 0 },
    ],
  },
};

Deno.test("sim-list: reads the SIMs endpoint with paging", async () => {
  const { ctx, calls } = mockCtx([sims]);
  const result = await action.execute({ perPage: 50, page: 2 }, ctx) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/sims");
  assertEquals(url.searchParams.get("per_page"), "50");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(result.count, 4);
});

/** The only visibility into running cost before the invoice. */
Deno.test("sim-list: totals data used and names the heaviest", async () => {
  const { ctx } = mockCtx([sims]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.totalMbUsed, 1516.5);
  assertEquals((result.heaviest as Record<string, unknown>).iccid, "89013");
});

/** A SIM past its limit silences its device and looks like an outage. */
Deno.test("sim-list: counts the over-limit SIMs and warns", async () => {
  const { ctx, logs } = mockCtx([sims]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.overLimitCount, 1);
  assertEquals(result.activeCount, 2, "over_limit is not counted as plainly active");
  assertEquals(logs[0].level, "warn");
  assert(/devices on them will look offline/.test(logs[0].message), logs[0].message);
});

Deno.test("sim-list: a healthy fleet does not warn", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: { sims: [{ iccid: "89011", status: "active", mb_used: 1 }] },
  }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.overLimitCount, 0);
  assertEquals(logs.length, 0);
});

Deno.test("sim-list: a bare array body is handled too", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{ iccid: "89011", status: "active", mb_used: 3 }],
  }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 1);
  assertEquals(result.totalMbUsed, 3);
});
