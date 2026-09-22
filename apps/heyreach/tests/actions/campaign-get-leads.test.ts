import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-get-leads.ts";

const URL_UNDER_TEST = "https://api.heyreach.io/api/public/campaign/GetLeadsFromCampaign";

Deno.test("campaign-get-leads: campaignId and paging travel in the POST body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 0, items: [] } }]);
  await action.execute!({ campaignId: 5, limit: 100, offset: 0 }, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { campaignId: 5, offset: 0, limit: 100 });
});

/** The window is meaningless without the filter it applies to. */
Deno.test("campaign-get-leads: timeFilter is sent with its window", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 0, items: [] } }]);
  await action.execute!({
    campaignId: 5,
    timeFilter: "LastActionTakenTime",
    timeFrom: "2026-09-01T00:00:00.000Z",
    timeTo: "2026-09-22T00:00:00.000Z",
    limit: 10,
    offset: 20,
  }, ctx);
  assertEquals(jsonBody(calls[0]), {
    campaignId: 5,
    offset: 20,
    limit: 10,
    timeFrom: "2026-09-01T00:00:00.000Z",
    timeTo: "2026-09-22T00:00:00.000Z",
    timeFilter: "LastActionTakenTime",
  });
});
