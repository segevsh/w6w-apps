import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/donation-list.ts";

Deno.test("donation-list: GETs /donations with a filter", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: [{ id: "1", type: "donations", attributes: { amount_in_cents: 5000 } }] },
  }]);
  const out = await action.execute({ filter: { "amount_in_cents][gt": 1000 } }, ctx) as {
    items: unknown[];
  };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/donations");
  assertEquals(url.searchParams.get("filter[amount_in_cents][gt]"), "1000");
  assertEquals(out.items, [{ id: "1", type: "donations", amount_in_cents: 5000 }]);
});
