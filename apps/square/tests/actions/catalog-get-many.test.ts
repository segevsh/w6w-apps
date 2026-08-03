import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/catalog-get-many.ts";

Deno.test("catalog-get-many: GETs /v2/catalog/list", async () => {
  const { ctx, calls } = mockCtx([{ body: { objects: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://connect.squareup.com/v2/catalog/list");
});

Deno.test("catalog-get-many: joins the selected types into Square's comma-separated list", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ types: ["ITEM", "CATEGORY"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("types"), "ITEM,CATEGORY");
});

Deno.test("catalog-get-many: omits `types` entirely when nothing is selected", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ types: [] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("types"), false);
});

Deno.test("catalog-get-many: passes catalog_version and cursor through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ catalogVersion: 1234, cursor: "c" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("catalog_version"), "1234");
  assertEquals(q.get("cursor"), "c");
});

Deno.test("catalog-get-many: offers no limit param — Square fixes the page size at 100", () => {
  assertEquals(action.params?.some((p) => p.key === "limit"), false);
  assert(/fixed at 100/i.test(action.description ?? ""), action.description);
});

Deno.test("catalog-get-many: every offered type is a real CatalogObjectType", () => {
  const valid = new Set([
    "ITEM",
    "IMAGE",
    "CATEGORY",
    "ITEM_VARIATION",
    "TAX",
    "DISCOUNT",
    "MODIFIER_LIST",
    "MODIFIER",
    "PRICING_RULE",
    "PRODUCT_SET",
    "TIME_PERIOD",
    "MEASUREMENT_UNIT",
    "SUBSCRIPTION_PLAN_VARIATION",
    "ITEM_OPTION",
    "ITEM_OPTION_VAL",
    "CUSTOM_ATTRIBUTE_DEFINITION",
    "QUICK_AMOUNTS_SETTINGS",
    "SUBSCRIPTION_PLAN",
    "AVAILABILITY_PERIOD",
  ]);
  const values = optionValues(action.params?.find((p) => p.key === "types"));
  assert(values.length > 0);
  for (const value of values) {
    assert(valid.has(value), `${value} is not a Square CatalogObjectType`);
  }
});
