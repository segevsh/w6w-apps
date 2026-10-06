import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/sms-analytics.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { startDate: "2026-10-01", endDate: "2026-10-05" };

Deno.test("sms-analytics: GET /report/analytics/p/sms with the date window", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ d: 1 }], total: { delivered: 3 } } }]);
  const out = await action.execute(INPUT, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v5/report/analytics/p/sms");
  assertEquals(queryOf(calls[0].url), { startDate: "2026-10-01", endDate: "2026-10-05" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(out, { data: [{ d: 1 }], total: { delivered: 3 } });
});

Deno.test("sms-analytics: the vendor's duration error (HTTP 200) fails the step", async () => {
  const { ctx } = mockCtx([{ body: { error: "Duration exceeds, allowed limit is 31 days" } }]);
  const err = await assertRejects(async () => await action.execute(INPUT, ctx)) as Error;
  assert(err.message.includes("31 days"));
});

Deno.test("sms-analytics: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], total: {} } }]);
  await action.execute({ startDate: "2026-10-01", endDate: "2026-10-05" }, ctx);
  assertEquals(calls[0].headers.authkey, undefined);
  assert(!calls[0].url.toLowerCase().includes("authkey"));
  assert(calls[0].url.startsWith("https://control.msg91.com/api/v5/"));
});

Deno.test("sms-analytics: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "Auth Key missing" } }]);
  const err = await assertRejects(async () =>
    await action.execute({ startDate: "2026-10-01", endDate: "2026-10-05" }, ctx)
  ) as Error;
  assert(err.message.includes("Auth Key missing"));
});
