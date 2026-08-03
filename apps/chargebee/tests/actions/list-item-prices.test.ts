import { assert, assertEquals } from "@std/assert";
import { connected, description, mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/list-item-prices.ts";

const ok = { status: 200, body: { list: [] } };

Deno.test("list-item-prices: is a search action over the item-price resource", () => {
  assertEquals(action.key, "list-item-prices");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "item-price");
});

Deno.test("list-item-prices: GETs /item_prices", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({}, connected(ctx));
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/item_prices");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("list-item-prices: sends every filter in operator form", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    itemId: "silver",
    itemFamilyId: "fam_1",
    currencyCode: "USD",
    pricingModel: "per_unit",
    status: "active",
  }, connected(ctx));
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("item_id[is]"), "silver");
  assertEquals(q.get("item_family_id[is]"), "fam_1");
  assertEquals(q.get("currency_code[is]"), "USD");
  assertEquals(q.get("pricing_model[is]"), "per_unit");
  assertEquals(q.get("status[is]"), "active");
});

Deno.test("list-item-prices: offers the five documented pricing models", () => {
  assertEquals(optionValues(action, "pricingModel"), [
    "flat_fee",
    "per_unit",
    "tiered",
    "volume",
    "stairstep",
  ]);
});

Deno.test("list-item-prices: sorts by name, id or updated_at", () => {
  assertEquals(optionValues(action, "sortAttribute"), ["name", "id", "updated_at"]);
});

Deno.test("list-item-prices: explains that it is the source of Create Subscription's ids", () => {
  assert(/item price ids/i.test(description(action)));
  assert(/Product Catalog 2\.0/.test(description(action)));
});
