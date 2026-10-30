import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import campaignList from "../../actions/campaign-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

test("campaign-list: calls GET /1/CampaignBuilderItems", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "1", name: "Test Campaign" }]) }]);
  const out = await campaignList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/1/CampaignBuilderItems");
  assertEquals(out.items.length, 1);
});
