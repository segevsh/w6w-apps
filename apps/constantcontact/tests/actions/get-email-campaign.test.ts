import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-email-campaign.ts";

Deno.test("get-email-campaign: GETs /v3/emails/{campaign_id}", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      campaign_id: "e1",
      name: "August newsletter",
      current_status: "Draft",
      campaign_activities: [{ campaign_activity_id: "ca1", role: "primary_email" }],
    },
  }]);
  const out = await action.execute!({ campaignId: "e1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/emails/e1");
  assertEquals(
    (out.campaign_activities as Array<Record<string, string>>)[0].role,
    "primary_email",
  );
});

Deno.test("get-email-campaign: url-encodes the campaign id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ campaignId: "a b/c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/emails/a%20b%2Fc");
});
