import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-get-sequence.ts";

Deno.test("campaign-get-sequence: the campaign id is a query parameter", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { nodeType: "MESSAGE", actionDelay: 3, actionDelayUnit: "HOUR" },
  }]);
  const result = await action.execute!({ campaignId: 5 }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.heyreach.io/api/public/campaign/GetCampaignSequence?campaignId=5",
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { nodeType: "MESSAGE", actionDelay: 3, actionDelayUnit: "HOUR" });
});

/** A campaign with no sequence answers an EMPTY 200, so the result is undefined. */
Deno.test("campaign-get-sequence: an empty 200 is undefined, not an error", async () => {
  const { ctx } = mockCtx([{ status: 200 }]);
  assertEquals(await action.execute!({ campaignId: 5 }, ctx), undefined);
});
