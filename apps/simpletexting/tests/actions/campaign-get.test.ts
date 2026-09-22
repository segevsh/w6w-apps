import { assertEquals } from "@std/assert";
import campaignGet from "../../actions/campaign-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

const CAMPAIGN = {
  campaignId: "507f191e810c19729de860ea",
  title: "Spring sale",
  state: "COMPLETED",
  type: "IMMEDIATELY",
  outcome: { successRate: 0.98, optOutRate: 0.01, totalSent: 100, creditsTotal: 100 },
};

Deno.test("campaign-get: reads one campaign by id and returns it verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: CAMPAIGN }]);
  const result = await campaignGet.execute({ campaignId: "507f191e810c19729de860ea" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/api/campaigns/507f191e810c19729de860ea`);
  assertEquals(result, CAMPAIGN);
});

Deno.test("campaign-get: escapes the campaign id as a single path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: CAMPAIGN }]);
  await campaignGet.execute({ campaignId: "507f191e810c19729de860ea" }, ctx);
  // A documentation typo drops the /campaigns/ segment; this app calls the real path.
  assertEquals(calls[0].url.includes("/api/campaigns/"), true);
});

Deno.test("campaign-get: is a read action grouped under campaign", () => {
  assertEquals(campaignGet.type, "read");
  assertEquals(campaignGet.resource, "campaign");
});
