import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-multiple-inventory-tiers.ts";

Deno.test("create-multiple-inventory-tiers: posts inventory_tiers array", async () => {
  const { ctx, calls } = mockCtx([{ body: { inventory_tiers: [] } }]);
  const result = await action.execute!({
    eventId: "e1",
    tiers: [{ name: "A", quantity_total: 1 }, { name: "B", quantity_total: 2 }],
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/events/e1/inventory_tiers/");
  assertEquals(JSON.parse(calls[0].body!), {
    inventory_tiers: [{ name: "A", quantity_total: 1 }, { name: "B", quantity_total: 2 }],
  });
  assertEquals(result, { inventory_tiers: [] });
});

Deno.test("create-multiple-inventory-tiers: accepts a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: { inventory_tiers: [] } }]);
  const result = await action.execute!({ eventId: "e1", tiers: '[{"name":"A"}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { inventory_tiers: [{ name: "A" }] });
  assertEquals(result, { inventory_tiers: [] });
});
