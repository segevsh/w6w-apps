import { assertEquals } from "@std/assert";
import { mockActiveCampaignCtx } from "../_helpers.ts";
import action from "../../actions/create-deal.ts";

Deno.test("create-deal: POSTs /deals wrapped in a `deal` envelope", async () => {
  const body = { deal: { id: "1" }, contacts: [], dealStages: [] };
  const { ctx, calls } = mockActiveCampaignCtx([{ body }]);
  const result = await action.execute(
    { title: "Big Deal", contact: "42", value: 10000, currency: "usd", stage: "3" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/3/deals");
  assertEquals(
    JSON.parse(calls[0].body!),
    { deal: { title: "Big Deal", contact: "42", value: 10000, currency: "usd", stage: "3" } },
  );
  assertEquals(result, body);
});
