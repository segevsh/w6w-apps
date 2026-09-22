import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-add-leads.ts";

const pairs = [{
  linkedInAccountId: 3,
  lead: { profileUrl: "https://www.linkedin.com/in/john-doe/", firstName: "John" },
}];

Deno.test("campaign-add-leads: POSTs account/lead pairs, not a flat lead list", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { addedLeadsCount: 1 } }]);
  await action.execute!({ campaignId: 5, accountLeadPairs: pairs }, ctx);
  assertEquals(calls[0].url, "https://api.heyreach.io/api/public/campaign/AddLeadsToCampaignV2");
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { campaignId: 5, accountLeadPairs: pairs });
});

/** `resumeFinishedCampaign: false` is a real choice — it does not mean "unset". */
Deno.test("campaign-add-leads: an explicit false resume flag is still sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { addedLeadsCount: 1 } }]);
  await action.execute!({
    campaignId: 5,
    accountLeadPairs: pairs,
    resumeFinishedCampaign: false,
    resumePausedCampaign: true,
  }, ctx);
  assertEquals(jsonBody(calls[0]), {
    campaignId: 5,
    accountLeadPairs: pairs,
    resumeFinishedCampaign: false,
    resumePausedCampaign: true,
  });
});

Deno.test("campaign-add-leads: the per-lead counts are returned untouched", async () => {
  const counts = { addedLeadsCount: 1, updatedLeadsCount: 0, failedLeadsCount: 2 };
  const { ctx } = mockCtx([{ status: 200, body: counts }]);
  assertEquals(await action.execute!({ campaignId: 5, accountLeadPairs: pairs }, ctx), counts);
});
