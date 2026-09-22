import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/stats-get-overall.ts";

const URL_UNDER_TEST = "https://api.heyreach.io/api/public/stats/GetOverallStats";
const window = {
  startDate: "2026-09-01T00:00:00.000Z",
  endDate: "2026-09-22T23:59:59.999Z",
};

/** An empty list means "everything", so the arrays are always present. */
Deno.test("stats-get-overall: sends empty id arrays rather than omitting them", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { byDayStats: {}, overallStats: {} } }]);
  await action.execute!({ ...window }, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { accountIds: [], campaignIds: [], ...window });
});

Deno.test("stats-get-overall: a scoped request sends both id lists", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ accountIds: [1234], campaignIds: "5,6", ...window }, ctx);
  assertEquals(jsonBody(calls[0]), { accountIds: [1234], campaignIds: [5, 6], ...window });
});

Deno.test("stats-get-overall: the two documented views are returned", async () => {
  const body = { byDayStats: { "2026-09-01T00:00:00Z": { messagesSent: 3 } }, overallStats: {} };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute!({ ...window }, ctx), body);
});
