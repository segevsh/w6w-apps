import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-start.ts";

Deno.test("campaign-start: POSTs the campaign id as a query parameter and returns the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const result = await action.execute!({ campaignId: 5 }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.heyreach.io/api/public/campaign/StartCampaign?campaignId=5",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  assertEquals(result, { status: 200 });
});

/** The documented 400 (bad status/schedule/accounts) must surface as an error. */
Deno.test("campaign-start: HeyReach's own 400 is thrown with its message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { errorMessage: "Campaign is not in a valid state" },
  }]);
  let message = "";
  try {
    await action.execute!({ campaignId: 5 }, ctx);
  } catch (err) {
    message = String(err);
  }
  assertEquals(/Campaign is not in a valid state/.test(message), true);
});
