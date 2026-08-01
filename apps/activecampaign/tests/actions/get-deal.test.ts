import { assertEquals } from "@std/assert";
import { mockActiveCampaignCtx } from "../_helpers.ts";
import action from "../../actions/get-deal.ts";

Deno.test("get-deal: GETs /deals/{id}", async () => {
  const body = { deal: { id: "9", title: "Big Deal" } };
  const { ctx, calls } = mockActiveCampaignCtx([{ body }]);
  const result = await action.execute({ dealId: "9" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/3/deals/9");
  assertEquals(result, body);
});
